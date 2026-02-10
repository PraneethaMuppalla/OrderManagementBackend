import { Request, Response } from 'express';
import { z } from 'zod';
import { Order, OrderItem, Cart, CartItem, MenuItem, OrderStatus } from '../models';
import { emitToUser, emitToAdmin } from '../services/socket';
import sequelize from '../config/database';
import { clearUserReservations } from '../services/inventoryReservation';

interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

const placeOrderSchema = z.object({
  delivery_name: z.string().min(1),
  delivery_address: z.string().min(1),
  delivery_phone: z.string().min(10),
});

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

// Place a new order
// Place a new order
export const placeOrder = async (req: AuthRequest, res: Response) => {
  const transaction = await sequelize.transaction();
  let isCommitted = false;
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 0. Check Idempotency
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ where: { idempotencyKey, userId } }); // Check userId for security
      if (existingOrder) {
        await transaction.rollback();
        return res.status(200).json({ 
          message: 'Order already processed (idempotent)', 
          order: existingOrder 
        });
      }
    }

    const validatedData = placeOrderSchema.safeParse(req.body);
    if (!validatedData.success) {
      await transaction.rollback();
      return res.status(400).json({ error: validatedData.error.issues });
    }

    const { delivery_name, delivery_address, delivery_phone } = validatedData.data;

    // 1. Get user's cart
    const cart = await Cart.findOne({
      where: { userId },
      include: [{ model: CartItem, as: 'items' }],
      transaction,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // 2. Process Items (Validate reservations, Lock Rows, Calculate Total)
    let totalAmount = 0;
    const orderItemsData = [];
    
    // Sort items to prevent deadlocks during row locking
    const sortedItems = [...cart.items].sort((a, b) => a.menuItemId - b.menuItemId);
    
    // Import reservation service
    const { consumeReservation } = await import('../services/inventoryReservation');

    for (const item of sortedItems) {
      // LOCK: Fetch MenuItem with Row Lock (Pessimistic Write Lock)
      // This ensures no other transaction can modify this item until we commit/rollback
      const menuItem = await MenuItem.findByPk(item.menuItemId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!menuItem) {
        await transaction.rollback();
        return res.status(404).json({ message: `Item ${item.menuItemId} not found` });
      }
      
      // ATOMIC CONSUMPTION: Verify and consume Redis reservation
      // This Lua script ensures check-and-delete is atomic
      const consumed = await consumeReservation(menuItem.id, userId, item.quantity);
      
      if (!consumed) {
        await transaction.rollback();
        return res.status(409).json({ 
          message: "Your cart has expired or reservation is invalid. Please review and confirm again.",
          action: "REFRESH_CART",
          itemId: menuItem.id
        });
      }

      // DB Inventory Check (Safety Net)
      if (menuItem.inventory_count < item.quantity) {
        await transaction.rollback();
        // Note: Redis reservation was consumed, but transaction failed.
        // In a perfect world, we'd restore Redis, but it's simpler to let user re-reserve.
        return res.status(409).json({ 
          message: `Insufficient inventory for ${menuItem.name}`,
          action: "REFRESH_CART"
        });
      }

      totalAmount += parseFloat(menuItem.price.toString()) * item.quantity;
      
      orderItemsData.push({
        menuItemId: menuItem.id,
        quantity: item.quantity,
        price_at_order: menuItem.price
      });

      // Update inventory in DB
      await menuItem.decrement('inventory_count', { by: item.quantity, transaction });
    }

    // 3. Create Order
    const order = await Order.create({
      userId,
      total_amount: totalAmount,
      status: OrderStatus.RECEIVED,
      delivery_name,
      delivery_address,
      delivery_phone,
      idempotencyKey: idempotencyKey || undefined
    }, { transaction });

    // 4. Create Order Items
    await Promise.all(orderItemsData.map(item => {
      return OrderItem.create({
        orderId: order.id,
        ...item
      }, { transaction });
    }));

    // 5. Clear Cart
    await CartItem.destroy({
      where: { cartId: cart.id },
      transaction
    });

    // 6. Commit Transaction
    await transaction.commit();
    isCommitted = true;

    // 7. Post-transaction actions (Events)
    
    // Clear any remaining reservations (redundant but safe)
    await clearUserReservations(userId);
    
    // Emit event to user
    emitToUser(userId, 'order_status_update', {
      orderId: order.id,
      status: order.status,
      message: `Order #${order.id} placed successfully!`
    });

    // Emit event to admins
    emitToAdmin('new_order', {
      orderId: order.id,
      userId,
      total_amount: totalAmount,
      items: orderItemsData.length
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order.id,
        status: order.status,
        total_amount: order.total_amount
      }
    });

  } catch (error) {
    if (!isCommitted) {
       await transaction.rollback();
       // If we consumed reservations but failed DB, they are lost from Redis.
       // User will have to re-reserve. This is acceptable for safety.
    }
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'Error placing order' });
  }
};

// Update order status (Admin only)
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const validatedData = updateOrderStatusSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error.issues });
    }

    const { status } = validatedData.data;

    const order = await Order.findByPk(parseInt(orderId as string));
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    // Emit real-time update to the specific user
    emitToUser(order.userId, 'order_status_update', {
      orderId: order.id,
      status: order.status,
      updatedAt: new Date(),
    });

    res.json({
      message: 'Order status updated',
      order: {
        id: order.id,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

// Get User Orders
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
       return res.status(401).json({ message: 'Unauthorized' });
    }

    const orders = await Order.findAll({
      where: { userId },
      include: [{
        model: OrderItem, // Note: You might need to set up alias 'items' in associations if not done
        as: 'items', // Assuming alias 'items' is used. Verify in index.ts
        include: [{
             model: MenuItem,
             as: 'menuItem',
             attributes: ['name', 'price']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Get Single Order Details
export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const userId = req.user?.id;
    // Assume userRole is populated in AuthRequest (or check DB for role)
    const userRole = req.user?.role; 

    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'price', 'image_url']
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check
    // If not admin, verify ownership
    if (userRole !== 'admin' && order.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Error fetching order details' });
  }
};

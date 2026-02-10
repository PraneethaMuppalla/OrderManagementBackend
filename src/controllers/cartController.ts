import { Request, Response } from 'express';
import { z } from 'zod';
import { Cart, CartItem, MenuItem } from '../models';

interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

const addToCartSchema = z.object({
  menuItemId: z.number(),
  quantity: z.number().min(1).default(1),
});

const updateCartItemSchema = z.object({
  quantity: z.number().min(0), // 0 to remove item
});

// Get user's cart with real-time inventory reconciliation
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Import reconciliation service
    const { reconcileCartItemReservation } = await import('../services/inventoryReservation');

    let cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ 
            model: MenuItem, 
            as: 'menuItem',
            attributes: ['id', 'name', 'description', 'price', 'image_url', 'category', 'is_available', 'inventory_count']
          }],
        },
      ],
    });

    if (!cart) {
      cart = await Cart.create({ userId });
    }

    const cartItems = cart.items || [];
    let cartChanged = false;
    const messages: string[] = [];
    const updatedItems = [];

    // Reconcile each item
    for (const item of cartItems) {
      const menuItem = item.menuItem as MenuItem;
      
      const result = await reconcileCartItemReservation(
        menuItem.id, 
        userId, 
        item.quantity
      );

      if (result.status === 'active' || result.status === 'restored') {
        // Reservation is good (refreshed or restored)
        updatedItems.push({
          ...item.toJSON(),
          available_now: result.quantity,
          is_available_now: true,
          availability_warning: result.status === 'restored' ? 'Reservation restored' : null
        });
      } else if (result.status === 'adjusted') {
        // Partial stock available
        item.quantity = result.quantity;
        await item.save();
        
        updatedItems.push({
          ...item.toJSON(),
          quantity: result.quantity,
          available_now: result.quantity,
          is_available_now: true,
          availability_warning: `Quantity adjusted to ${result.quantity} due to availability`
        });
        messages.push(`Adjusted quantity for ${menuItem.name} to ${result.quantity}`);
        cartChanged = true;
      } else {
        // No stock or failed to lock -> Remove item
        await item.destroy();
        messages.push(`Removed ${menuItem.name} from cart due to unavailability`);
        cartChanged = true;
      }
    }

    // Calculate totals based on updated items
    const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = updatedItems.reduce((sum, item) => {
      // menuItem is nested in JSON structure from toJSON() + include
      // We need to access price safely
      const price = parseFloat(item.menuItem.price.toString());
      return sum + (price * item.quantity);
    }, 0);

    const total = subtotal; // Add tax/shipping logic here if needed

    res.json({
      cart: {
        id: cart.id,
        userId: cart.userId,
        items: updatedItems.map(item => ({
          ...item,
          itemTotal: (parseFloat(item.menuItem.price.toString()) * item.quantity).toFixed(2)
        })),
        itemCount,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        messages: messages.length > 0 ? messages : undefined,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Error retrieving cart' });
  }
};

// Add item to cart
// Add item to cart with inventory reservation
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validatedData = addToCartSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error.issues });
    }

    const { menuItemId, quantity } = validatedData.data;

    // Check if menu item exists
    const menuItem = await MenuItem.findByPk(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    if (!menuItem.is_available) {
      return res.status(400).json({ message: 'Item is not available' });
    }

    // Get or create cart
    let cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      cart = await Cart.create({ userId });
    }

    // Check if item already in cart
    let cartItem = await CartItem.findOne({
      where: { cartId: cart.id, menuItemId },
    });

    // Calculate new total quantity
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    const newTotalQuantity = currentQuantity + quantity;

    // CRITICAL: Reserve inventory using Redis with distributed locking
    const { reserveInventory } = await import('../services/inventoryReservation');
    const reservationResult = await reserveInventory(menuItemId, userId, newTotalQuantity);

    if (!reservationResult.success) {
      return res.status(400).json({
        message: reservationResult.message,
        available: reservationResult.available,
        reserved: reservationResult.reserved,
        currentInCart: currentQuantity
      });
    }

    // Update cart item after successful reservation
    if (cartItem) {
      cartItem.quantity = newTotalQuantity;
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        cartId: cart.id,
        menuItemId,
        quantity: newTotalQuantity,
      });
    }

    // Reload cart with items
    const updatedCart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ 
            model: MenuItem, 
            as: 'menuItem',
            attributes: ['id', 'name', 'description', 'price', 'image_url', 'category', 'is_available', 'inventory_count']
          }],
        },
      ],
    });

    res.json({ 
      message: 'Item added to cart', 
      cart: updatedCart,
      reservation: {
        reserved: reservationResult.reserved,
        available: reservationResult.available
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding item to cart' });
  }
};

// Update cart item quantity with inventory reservation
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { cartItemId } = req.params;
    const validatedData = updateCartItemSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error.issues });
    }

    const { quantity } = validatedData.data;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const cartItem = await CartItem.findOne({
      where: { id: cartItemId, cartId: cart.id },
      include: [{ model: MenuItem, as: 'menuItem' }],
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    const menuItem = cartItem.menuItem as MenuItem;
    const { updateReservation } = await import('../services/inventoryReservation');

    // If quantity is 0, remove the item and release reservation
    if (quantity === 0) {
      await updateReservation(menuItem.id, userId, 0);
      await cartItem.destroy();
      return res.json({ message: 'Item removed from cart' });
    }

    // Update reservation with new quantity
    const reservationResult = await updateReservation(menuItem.id, userId, quantity);
    
    if (!reservationResult.success) {
      return res.status(400).json({ 
        message: reservationResult.message, 
        available: reservationResult.available,
        reserved: reservationResult.reserved
      });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.json({ 
      message: 'Cart item updated', 
      cartItem,
      reservation: {
        reserved: reservationResult.reserved,
        available: reservationResult.available
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating cart item' });
  }
};

// Clear cart and release all reservations
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Clear all inventory reservations for this user
    const { clearUserReservations } = await import('../services/inventoryReservation');
    await clearUserReservations(userId);

    // Delete all cart items
    await CartItem.destroy({ where: { cartId: cart.id } });

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error clearing cart' });
  }
};

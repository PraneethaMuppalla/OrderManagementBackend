import { Router } from 'express';
import { placeOrder, updateOrderStatus, getUserOrders, getOrder } from '../controllers/orderController';
import { authenticateJWT, authorizeAdmin } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Place a new order
router.post('/', placeOrder);

// Get user's orders
router.get('/', getUserOrders);

// Get detailed order view
router.get('/:id', getOrder);

// Update order status (Admin only)
router.put('/:orderId/status', authorizeAdmin, updateOrderStatus);

export default router;

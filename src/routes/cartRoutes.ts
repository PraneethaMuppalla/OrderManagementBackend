import { Router } from 'express';
import { getCart, addToCart, updateCartItem, clearCart } from '../controllers/cartController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:cartItemId', updateCartItem);
router.delete('/clear', clearCart);

export default router;

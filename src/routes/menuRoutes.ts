import { Router } from 'express';
import { getMenuItems, getMenuCategories } from '../controllers/menuController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Get all categories with counts (should be before '/' route to avoid conflicts)
router.get('/categories', authenticateJWT, getMenuCategories);

// Protected route - requires authentication
router.get('/', authenticateJWT, getMenuItems);

// router.get('/low-stock', getLowStockItems);
// router.get('/:id/stock-status', getItemStockStatus);
// router.post('/', createMenuItem); // Should be protected by admin middleware in a real app

export default router;

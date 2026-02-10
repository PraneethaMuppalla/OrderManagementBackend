import { Request, Response } from 'express';
import { MenuItem } from '../models';
import { Op } from 'sequelize';
import sequelize from '../config/database';

export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const { cursor, limit = 12, category, search } = req.query;
    
    // Parse limit as number
    const pageLimit = parseInt(limit as string, 10);
    
    // Build where clause
    const whereClause: any = { is_available: true };
    
    // Add cursor condition (for pagination)
    if (cursor) {
      whereClause.id = { [Op.gt]: parseInt(cursor as string, 10) };
    }
    
    // Add category filter
    if (category && category !== 'all') {
      whereClause.category = category;
    }
    
    // Add search filter (search in name and description)
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Fetch items with limit + 1 to check if there are more items
    const items = await MenuItem.findAll({
      where: whereClause,
      limit: pageLimit + 1,
      order: [['id', 'ASC']]
    });
    
    // Check if there are more items
    const hasMore = items.length > pageLimit;
    
    // Remove the extra item if exists
    const paginatedItems = hasMore ? items.slice(0, pageLimit) : items;
    
    // Get the next cursor (ID of the last item)
    const nextCursor = paginatedItems.length > 0 
      ? paginatedItems[paginatedItems.length - 1].id 
      : null;
    
    // Get total count for the current filters
    const totalCount = await MenuItem.count({ where: whereClause });
    
    res.json({
      items: paginatedItems,
      pagination: {
        nextCursor,
        hasMore,
        limit: pageLimit,
        total: totalCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving menu items' });
  }
};

export const getMenuCategories = async (req: Request, res: Response) => {
  try {
    // Use a single optimized query with GROUP BY to get categories and their counts
    // This is much more efficient than fetching all items and grouping in code
    const categories = await MenuItem.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_items'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN is_available = true THEN 1 ELSE 0 END')), 'available_items'],
        [sequelize.fn('AVG', sequelize.col('price')), 'avg_price']
      ],
      group: ['category'],
      order: [[sequelize.literal('total_items'), 'DESC']],
      raw: true
    });

    // Format the response
    const formattedCategories = categories.map((cat: any) => ({
      category: cat.category,
      totalItems: parseInt(cat.total_items, 10),
      availableItems: parseInt(cat.available_items, 10),
      avgPrice: parseFloat(parseFloat(cat.avg_price).toFixed(2))
    }));

    // Calculate totals
    const totalItems = formattedCategories.reduce((sum, cat) => sum + cat.totalItems, 0);
    const totalAvailable = formattedCategories.reduce((sum, cat) => sum + cat.availableItems, 0);

    res.json({
      categories: formattedCategories,
      summary: {
        totalCategories: formattedCategories.length,
        totalItems,
        totalAvailable
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving menu categories' });
  }
};

// export const getLowStockItems = async (req: Request, res: Response) => {
//   try {
//     // Find items where inventory_count <= low_stock_threshold
//     const lowStockItems = await MenuItem.findAll({
//       where: sequelize.where(
//         sequelize.col('inventory_count'),
//         Op.lte,
//         sequelize.col('low_stock_threshold')
//       ),
//       order: [['inventory_count', 'ASC']]
//     });

//     const response = lowStockItems.map(item => ({
//       id: item.id,
//       name: item.name,
//       category: item.category,
//       inventory_count: item.inventory_count,
//       low_stock_threshold: item.low_stock_threshold,
//       is_available: item.is_available,
//       status: item.inventory_count === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
//       needs_reorder: true
//     }));

//     res.json({
//       total: response.length,
//       items: response
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error retrieving low stock items' });
//   }
// };

// export const getItemStockStatus = async (req: Request, res: Response) => {
//   try {
//     const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
//     const item = await MenuItem.findByPk(parseInt(id, 10));

//     if (!item) {
//       return res.status(404).json({ message: 'Menu item not found' });
//     }

//     const stockStatus = {
//       id: item.id,
//       name: item.name,
//       inventory_count: item.inventory_count,
//       low_stock_threshold: item.low_stock_threshold,
//       is_available: item.is_available,
//       status: item.inventory_count === 0 
//         ? 'OUT_OF_STOCK' 
//         : item.inventory_count <= item.low_stock_threshold 
//           ? 'LOW_STOCK' 
//           : 'IN_STOCK',
//       percentage: Math.round((item.inventory_count / (item.low_stock_threshold * 10)) * 100),
//       needs_reorder: item.inventory_count <= item.low_stock_threshold
//     };

//     res.json(stockStatus);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error retrieving stock status' });
//   }
// };

// export const createMenuItem = async (req: Request, res: Response) => {
//   try {
//     // Basic implementation for admin (simplified for now)
//     const item = await MenuItem.create(req.body);
//     res.status(201).json(item);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error creating menu item' });
//   }
// };

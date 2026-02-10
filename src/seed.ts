import { MenuItem } from './models';

const seedMenu = async () => {
  const items = [
    {
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella, and basil.',
      price: 12.99,
      image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&w=400&q=80',
      category: 'Pizza',
      inventory_count: 50,
      low_stock_threshold: 5,
    },
    {
      name: 'Cheeseburger',
      description: 'Juicy beef patty with cheddar cheese, lettuce, and tomato.',
      price: 9.99,
      image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
      category: 'Burgers',
      inventory_count: 75,
      low_stock_threshold: 10,
    },
    {
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with Caesar dressing and croutons.',
      price: 8.50,
      image_url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=400&q=80',
      category: 'Salads',
      inventory_count: 40,
      low_stock_threshold: 8,
    },
    {
      name: 'Pasta Carbonara',
      description: 'Creamy pasta with pancetta and parmesan cheese.',
      price: 13.50,
      image_url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=400&q=80',
      category: 'Pasta',
      inventory_count: 60,
      low_stock_threshold: 10,
    },
  ];

  try {
    for (const item of items) {
        const existing = await MenuItem.findOne({ where: { name: item.name } });
        if (!existing) {
            await MenuItem.create(item);
            console.log(`Seeded: ${item.name}`);
        }
    }
  } catch (error) {
    console.error('Error seeding menu:', error);
  }
};

export default seedMenu;

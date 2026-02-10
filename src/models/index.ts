import User from './User';
import MenuItem from './MenuItem';
import Order from './Order';
import OrderItem from './OrderItem';
import Cart from './Cart';
import CartItem from './CartItem';

// User - Order Associations
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Order - OrderItem Associations
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// MenuItem - OrderItem Associations
MenuItem.hasMany(OrderItem, { foreignKey: 'menuItemId' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menuItemId', as: 'menuItem' });

// User - Cart Associations
User.hasOne(Cart, { foreignKey: 'userId', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'userId' });

// Cart - CartItem Associations
Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

// MenuItem - CartItem Associations
MenuItem.hasMany(CartItem, { foreignKey: 'menuItemId' });
CartItem.belongsTo(MenuItem, { foreignKey: 'menuItemId', as: 'menuItem' });

export {
  User,
  MenuItem,
  Order,
  OrderItem,
  Cart,
  CartItem
};

export { OrderStatus } from './Order';

import { DataTypes, Model, Optional, Association } from 'sequelize';
import sequelize from '../config/database';
import MenuItem from './MenuItem';

interface CartItemAttributes {
  id: number;
  cartId: number;
  menuItemId: number;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CartItemCreationAttributes extends Optional<CartItemAttributes, 'id'> {}

class CartItem extends Model<CartItemAttributes, CartItemCreationAttributes> implements CartItemAttributes {
  public id!: number;
  public cartId!: number;
  public menuItemId!: number;
  public quantity!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly menuItem?: MenuItem;

  public static associations: {
    menuItem: Association<CartItem, MenuItem>;
  };
}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    menuItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
  },
  {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    indexes: [
      {
        unique: true,
        fields: ['cartId', 'menuItemId'],
      },
    ],
  }
);

export default CartItem;

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MenuItemAttributes {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_available: boolean;
  inventory_count: number;
  low_stock_threshold: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MenuItemCreationAttributes extends Optional<MenuItemAttributes, 'id' | 'is_available' | 'inventory_count' | 'low_stock_threshold'> {}

class MenuItem extends Model<MenuItemAttributes, MenuItemCreationAttributes> implements MenuItemAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public price!: number;
  public image_url!: string;
  public category!: string;
  public is_available!: boolean;
  public inventory_count!: number;
  public low_stock_threshold!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MenuItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    inventory_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
  },
  {
    sequelize,
    modelName: 'MenuItem',
    tableName: 'menu_items',
  }
);

export default MenuItem;

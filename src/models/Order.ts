import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum OrderStatus {
  RECEIVED = 'Order Received',
  PREPARING = 'Preparing',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

interface OrderAttributes {
  id: number;
  userId: number;
  total_amount: number;
  status: OrderStatus;
  delivery_name: string;
  delivery_address: string;
  delivery_phone: string;
  idempotencyKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | 'status' | 'idempotencyKey'> {}

class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: number;
  public userId!: number;
  public total_amount!: number;
  public status!: OrderStatus;
  public delivery_name!: string;
  public delivery_address!: string;
  public delivery_phone!: string;
  public idempotencyKey?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OrderStatus)),
      defaultValue: OrderStatus.RECEIVED,
    },
    delivery_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    delivery_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    delivery_phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    idempotencyKey: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
  }
);

export default Order;

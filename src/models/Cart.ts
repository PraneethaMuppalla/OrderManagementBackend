import { DataTypes, Model, Optional, Association, HasManyGetAssociationsMixin } from 'sequelize';
import sequelize from '../config/database';
import CartItem from './CartItem';

interface CartAttributes {
  id: number;
  userId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CartCreationAttributes extends Optional<CartAttributes, 'id'> {}

class Cart extends Model<CartAttributes, CartCreationAttributes> implements CartAttributes {
  public id!: number;
  public userId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association mixins
  public getItems!: HasManyGetAssociationsMixin<CartItem>;
  
  // Association attributes
  public readonly items?: CartItem[];

  public static associations: {
    items: Association<Cart, CartItem>;
  };
}

Cart.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: 'Cart',
    tableName: 'carts',
  }
);

export default Cart;

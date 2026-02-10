'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'idempotencyKey', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true // Ensure uniqueness
    });
    
    // Add index for performance
    await queryInterface.addIndex('orders', ['idempotencyKey'], {
      unique: true,
      name: 'orders_idempotency_key_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('orders', 'orders_idempotency_key_unique');
    await queryInterface.removeColumn('orders', 'idempotencyKey');
  }
};

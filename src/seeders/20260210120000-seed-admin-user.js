'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('admin123', salt);

    // Check if admin already exists
    const adminExists = await queryInterface.rawSelect('users', {
      where: { email: 'admin@example.com' },
    }, ['id']);

    if (!adminExists) {
      await queryInterface.bulkInsert('users', [{
        name: 'Admin User',
        email: 'admin@example.com',
        password_hash: password_hash,
        phone_number: '0000000000',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  }
};

'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('userTimeMaps', {
      uuid: {
        primaryKey: true,
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      timestamp: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('userTimeMaps');
  }
};
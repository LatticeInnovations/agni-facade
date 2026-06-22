'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserLoginActivities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        // References the FHIR Practitioner.id (UUID), not a local FK constraint,
        // since practitioner records live on the FHIR server, not this DB.
        allowNull: false,
        type: Sequelize.INTEGER
      },
      orgId: {
        allowNull: true,
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Speeds up "get latest login for user" and "logins in date range" queries
    await queryInterface.addIndex('UserLoginActivities', ['userId', 'orgId']);
    await queryInterface.addIndex('UserLoginActivities', ['createdAt']);
    await queryInterface.addIndex('UserLoginActivities', ['userId', 'createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserLoginActivities');
  }
};
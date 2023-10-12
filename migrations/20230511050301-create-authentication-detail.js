'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('authentication_details', {
      auth_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
        references: {
          model: 'hfj_resource',
          key: 'res_id'
        }
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      first_login: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      salt: {
        type: Sequelize.STRING,
        allowNull: false
      },
      attempt_timestamp: {
        type: Sequelize.DATE,
        allowNull: true
      },
      login_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      otp: {
        type: Sequelize.STRING,
        allowNull: true
      },
      otp_check_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      otp_generate_attempt: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      otp_gen_time: {
        allowNull: true,
        type: Sequelize.DATE
      },
      createdOn: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      }
    });
  }
};
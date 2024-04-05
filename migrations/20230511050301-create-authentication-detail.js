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
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      forceSetPassword: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      salt: {
        type: Sequelize.STRING,
        allowNull: true
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
      sessionId: {
        allowNull: true,
        type: Sequelize.STRING
      },
      sessionCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      setPasswordOn: {
        allowNull: true,
        type: Sequelize.DATE
      },
      updatedOn: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      otpVerified: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    });
  }
};
'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserLoginActivity extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // No belongsTo association defined here — confirm whether userId/orgId
      // reference local Sequelize models or external (FHIR) ids before adding one.
    }
  }

  UserLoginActivity.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      orgId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'UserLoginActivity',
      tableName: 'UserLoginActivities',
      timestamps: true,
      createdAt: true,
      updatedAt: false // table only has createdAt; rows are never updated
    }
  );

  return UserLoginActivity;
};
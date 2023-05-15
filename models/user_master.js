'use strict';
const { Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class user_master extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasOne(models.authentication_detail, {
        foreignKey: 'user_id',
        sourceKey: 'user_id'
      })
    }
  }
  user_master.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    user_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_email: {
      type: DataTypes.STRING(70),
      allowNull: false, unique: true
    },
    mobile_number: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      allowNull: false,
    }
  }, {
    sequelize,
    timestamps: false,
    modelName: 'user_master',
    tableName: 'user_master'
  });
  return user_master;
};
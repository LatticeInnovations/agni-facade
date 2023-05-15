'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class authentication_detail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.user_master, {
        foreignKey: "user_id",
        targetKey: "user_id"
      });
    }
  }
  authentication_detail.init({
    auth_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: DataTypes.INTEGER,
    otp: DataTypes.INTEGER,
    expire_time: DataTypes.DATE,
    login_attempts: DataTypes.INTEGER,
    lockTime: DataTypes.DATE,
    createdOn: DataTypes.DATE
  }, {
    sequelize,
    timestamps: false,
    modelName: 'authentication_detail'
  });


  return authentication_detail;
};
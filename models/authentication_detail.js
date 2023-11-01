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
      this.belongsTo(models.hfj_resource, {
        foreignKey: "user_id",
        targetKey: "res_id"
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
    user_id: DataTypes.BIGINT,
    password: DataTypes.STRING,
    salt: DataTypes.STRING,
    is_active: DataTypes.BOOLEAN,
    forceSetPassword: DataTypes.BOOLEAN,
    login_attempts: DataTypes.INTEGER,
    attempt_timestamp: DataTypes.DATE,
    otp: DataTypes.STRING,
    otp_check_attempts: DataTypes.INTEGER,
    otp_generate_attempt: DataTypes.INTEGER,
    otp_gen_time: DataTypes.DATE,
    sessionId:  DataTypes.STRING,
    sessionCount: DataTypes.INTEGER,
    setPasswordOn: DataTypes.DATE,
    updatedOn: DataTypes.DATE,
    otpVerified: DataTypes.BOOLEAN
  }, {
    sequelize,
    timestamps: false,
    modelName: 'authentication_detail'
  });


  return authentication_detail;
};
'use strict';
const { Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class hfj_resource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasOne(models.authentication_detail, {
        foreignKey: 'user_id',
        sourceKey: 'res_id'
      })
    }
  }
  hfj_resource.init({
    res_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: false,
      primaryKey: true
    },
    res_type: {
      type: DataTypes.STRING(40),
      allowNull: false
    }
  }, {
    sequelize,
    timestamps: false,
    modelName: 'hfj_resource',
    tableName: 'hfj_resource'
  });
  return hfj_resource;
};
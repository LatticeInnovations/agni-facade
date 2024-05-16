'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class userTimeMap extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  userTimeMap.init({
    uuid: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true
    },
    timestamp: {
      allowNull: false,
      type: DataTypes.DATE
    },
    orgId : {
      type : DataTypes.INTEGER
    }
  }, {
    sequelize,
    modelName: 'userTimeMap',
    timestamps: false
  });
  return userTimeMap;
};
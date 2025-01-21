const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Your database connection

const Loadout = sequelize.define(
  'Loadout',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
    },
    prevents_damage: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    damage_points: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
)

module.exports = Loadout;

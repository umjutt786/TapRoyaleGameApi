const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Your database connection

const Loadout = sequelize.define('Loadout', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    prevents_damage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    thief_effect: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    money_multiplier: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 1.0,
    },
}, {
    timestamps: true,
    underscored: true,
});

module.exports = Loadout;

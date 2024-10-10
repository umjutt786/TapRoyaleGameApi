// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Your database connection

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    country_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    total_kills: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    total_extracted_money: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
    },
}, {
    timestamps: true,
    underscored: true,
});

module.exports = User;

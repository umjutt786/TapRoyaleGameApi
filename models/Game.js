const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Game = sequelize.define('Game', {
    started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    ended_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
    underscored: true,
});

module.exports = Game;

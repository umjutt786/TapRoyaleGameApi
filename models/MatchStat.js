const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MatchStat = sequelize.define('MatchStat', {
    player_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    kills: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    damage_dealt: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
    },
    is_winner: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_bot: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    assist: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    rank: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    health: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
    },
    death: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    timestamps: true,
    underscored: true,
});

module.exports = MatchStat;

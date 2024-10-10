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
}, {
    timestamps: true,
    underscored: true,
});

module.exports = MatchStat;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Your database connection
const Loadout = require('./Loadout'); // Ensure this import is correct

const PlayerGameLoadout = sequelize.define('PlayerGameLoadout', {
    player_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'games',
            key: 'id',
        },
    },
    loadout_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'loadouts',
            key: 'id',
        },
    },
}, {
    timestamps: true,
    underscored: true,
});

// Create associations
PlayerGameLoadout.belongsTo(Loadout, {
    foreignKey: 'loadout_id',
    as: 'loadout',
});

module.exports = PlayerGameLoadout;

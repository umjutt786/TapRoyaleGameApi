// controllers/loadoutController.js
const Loadout = require('../models/Loadout');
const PlayerGameLoadout = require('../models/PlayerGameLoadout');

// Controller to fetch all available loadouts
const getAllLoadouts = async (req, res) => {
    try {
        const loadouts = await Loadout.findAll();
        res.json(loadouts);
    } catch (error) {
        console.error('Error fetching loadouts:', error);
        res.status(500).json({ error: 'An error occurred while fetching loadouts' });
    }
};

// Controller to assign loadout to player for a game
const assignLoadoutToPlayer = async (req, res) => {
    const { playerId, loadoutId } = req.body;
    const gameId = req.params.gameId;

    try {
        const playerGameLoadout = await PlayerGameLoadout.create({
            player_id: playerId,
            game_id: gameId,
            loadout_id: loadoutId,
        });

        res.status(201).json(playerGameLoadout);
    } catch (error) {
        console.error('Error assigning loadout:', error);
        res.status(500).json({ error: 'An error occurred while assigning loadout' });
    }
};

module.exports = {
    getAllLoadouts,
    assignLoadoutToPlayer,
};

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
    console.log('I am assignLoadoutToPlayer')
    const { playerId, loadoutId, duration } = req.body
    const gameId = req.params.gameId

    try {
      const playerGameLoadout = await PlayerGameLoadout.create({
        player_id: playerId,
        game_id: gameId,
        loadout_id: loadoutId,
      })

      if (duration !== null) {
        // duration is null for air strike and this
        //set-timeout will be skipped for air strike
        // Set a timeout to delete the PlayerGameLoadout entry after the specified duration
        setTimeout(async () => {
          try {
            await PlayerGameLoadout.destroy({
              where: {
                player_id: playerId,
                game_id: gameId,
                loadout_id: loadoutId,
              },
            })
            console.log(
              `Loadout for player ${playerId} in game ${gameId} deleted after duration.`,
            )
          } catch (error) {
            console.error(
              'Error deleting PlayerGameLoadout after duration:',
              error,
            )
          }
        }, duration * 1000) // Convert duration from seconds to milliseconds
      }

      res.status(201).json(playerGameLoadout)
    } catch (error) {
      console.log('I am sending error')
      console.error('Error assigning loadout:', error)
      res
        .status(500)
        .json({ error: 'An error occurred while assigning loadout' })
    }
};

module.exports = {
    getAllLoadouts,
    assignLoadoutToPlayer,
};

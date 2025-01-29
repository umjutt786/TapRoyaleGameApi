// controllers/loadoutController.js
const Loadout = require('../models/Loadout');
const PlayerGameLoadout = require('../models/PlayerGameLoadout');
const User = require('../models/User')
const MatchStat = require('../models/MatchStat')
const { games: battleRoyaleGame } = require('./GameController')
const { games: deathMatchGame } = require('./deathMatchController')

// Controller to fetch all available loadouts
const getAllLoadouts = async (req, res) => {
  try {
    const loadouts = await Loadout.findAll()
    res.json(loadouts)
  } catch (error) {
    console.error('Error fetching loadouts:', error)
    res.status(500).json({ error: 'An error occurred while fetching loadouts' })
  }
}

// Controller to assign loadout to player for a game
const assignLoadoutToPlayer = async (req, res) => {
  const { gameMode, playerId, loadoutId, duration } = req.body
  const gameId = req.params.gameId
  let game
  if (gameMode === 'BR') {
    game = battleRoyaleGame[gameId]
  } else if (gameMode === 'DM') {
    game = deathMatchGame[gameId]
  }
  let usedGameMoney = false
  let remainingMoney = 0

  try {
    // Find the loadout by ID
    const loadout = await Loadout.findByPk(loadoutId)

    // Check if loadout exists
    if (!loadout) {
      return res.status(404).json({ error: 'Loadout not found' })
    }

    // Deduct loadout price from player's total_extracted_money
    const player = await User.findByPk(playerId)
    // check if the player have enough money to buy this loadout
    if (player.total_extracted_money < loadout.price) {
      // use current game's earning if the player's money is not enough
      const playerStat = await MatchStat.findOne({
        where: { player_id: playerId, game_id: gameId },
      })
      // check if the player have enough current game's earning to buy this
      // this loadout
      if (playerStat.damage_dealt < loadout.price) {
        return res.sendError(
          "You don't have enough money to buy this loadout.",
          402,
        )
      }
      playerStat.damage_dealt -= loadout.price
      game.stats[playerId].damage_dealt = playerStat.damage_dealt
      usedGameMoney = true
      await playerStat.save()
    } else {
      player.total_extracted_money -= loadout.price
      remainingMoney = player.total_extracted_money
      await player.save()
    }

    // Doing same thing above with playerStat.money_spent += loadout.price
    // Increment money_spent of current game in database
    await MatchStat.increment(
      { money_spent: loadout.price },
      { where: { player_id: playerId, game_id: gameId } },
    )

    // Create PlayerGameLoadout entry

    const playerGameLoadout = await PlayerGameLoadout.create({
      player_id: playerId,
      game_id: gameId,
      loadout_id: loadoutId,
    })

    // duration is null for air strike and this set-timeout will be skipped for air strike
    if (duration !== null) {
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
          // console.log(
          //   `Loadout for player ${playerId} in game ${gameId} deleted after duration.`,
          // )
        } catch (error) {
          console.error(
            'Error deleting PlayerGameLoadout after duration:',
            error,
          )
        }
      }, duration * 1000) // Convert duration from seconds to milliseconds
    }

    res.status(201).json({
      message: 'Loadout assigned successfully',
      playerGameLoadout,
      usedGameMoney,
      remainingMoney,
      game: { players: game.players, health: game.health, stats: game.stats },
    })
  } catch (error) {
    // console.log('I am sending error')
    console.error('Error assigning loadout:', error)
    res.status(500).json({ error: 'An error occurred while assigning loadout' })
  }
}

module.exports = {
    getAllLoadouts,
    assignLoadoutToPlayer,
};

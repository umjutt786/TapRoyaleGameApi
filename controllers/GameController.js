const MatchStat = require('../models/MatchStat')
const Game = require('../models/Game')
const Player = require('../models/User')
const PlayerGameLoadout = require('../models/PlayerGameLoadout')
const Loadout = require('../models/Loadout')
const socketManager = require('../socket') // Import the socket manager
const User = require('../models/User')

let games = {}
let botCounter = -1
const MAX_PLAYERS = 30
const INITIAL_HEALTH = 50
const BOT_JOIN_DELAY = 15000
const BOT_ATTACK_MIN_DELAY = 1000
const BOT_ATTACK_MAX_DELAY = 10000

// Function to create a new game
const createGame = async () => {
  const game = await Game.create({})
  const gameId = game.id
  games[gameId] = {
    players: [],
    health: {},
    stats: {},
    botsAdded: false,
  }

  // Set a timeout to add bots if no other player joins within the delay
  setTimeout(async () => {
    if (games[gameId].players.length < MAX_PLAYERS) {
      // console.log('Adding bots to the game...')
      await addBotsToGame(gameId)
      startGame(gameId)
    }
  }, BOT_JOIN_DELAY)

  return gameId
}
const joinGame = async (userId) => {
  let currentGameId = Object.keys(games).find(
    (gameId) => games[gameId].players.length < MAX_PLAYERS
  )

  // If no game is available, create a new game
  if (!currentGameId) {
    currentGameId = await createGame() // Create a new game if none is available
  }

  // Fetch the user to check if they exist
  const user = await Player.findOne({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found' }
  }

  // Ensure the player is not already in the game
  const existingStat = await MatchStat.findOne({
    where: { player_id: userId, game_id: currentGameId },
  })
  if (existingStat) {
    return { error: 'Player is already in the game' }
  }

  // Check the current player count in the game
  const playerCount = await MatchStat.count({
    where: { game_id: currentGameId },
  })
  if (playerCount >= MAX_PLAYERS) {
    return { error: 'Game is full' } // If game is full, return error
  }

  // Add the player to the game
  const playerStats = await MatchStat.create({
    player_id: userId,
    game_id: currentGameId,
    kills: 0,
    damage_dealt: 0,
    damage_inflicted: 0,
    money_spent: 0,
    is_winner: false,
  })
  const loadouts = await Loadout.findAll()
  games[currentGameId].stats[userId] = {
    kills: 0,
    assists: 0,
    death: 0,
    rank: 1,
    damage_dealt: 0,
    damage_inflicted: 0,
    money_spent: 0,
    health: INITIAL_HEALTH,
  }
  games[currentGameId].health[userId] = INITIAL_HEALTH
  games[currentGameId].players.unshift({ id: userId })

  // console.log(`Player ${userId} joined game ${currentGameId}`)

  // Return the player details along with the current gameId
  return {
    id: userId,
    user: user,
    gameId: currentGameId,
    playerStats: playerStats,
    loadouts: loadouts,
    games: games,
  }
}

// Function to add bots to the game
const addBotsToGame = async (gameId) => {
  while (games[gameId].players.length < MAX_PLAYERS) {
    botCounter--
    const botId = botCounter

    await MatchStat.create({
      player_id: botId,
      game_id: gameId,
      kills: 0,
      damage_dealt: 0,
      damage_inflicted: 0,
      money_spent: 0,
      is_winner: false,
      is_bot: true,
    })

    games[gameId].health[botId] = INITIAL_HEALTH
    games[gameId].stats[botId] = {
      kills: 0,
      damage_dealt: 0,
      damage_inflicted: 0,
    }
    games[gameId].players.push({ id: botId, isBot: true })

    // console.log(`Bot ${botId} joined game ${gameId}`)
  }

  startBotActions(gameId)
}

// Function to start the game
const startGame = (gameId) => {
  const io = socketManager.getIo() // Get the io instance
  const game = games[gameId]
  // console.log(`Game with room id: ${gameId} started with players:`, game.players)
  io.to(`${gameId}`).emit('gameStarted', {
    message: `Game ${gameId} has started!`,
    game: game,
  })
}

// Function to start the bot attack logic
const startBotActions = (gameId) => {
  const game = games[gameId]

  game.players.forEach((player) => {
    if (player.isBot) {
      setInterval(
        () => {
          if (game.players.length > 1) {
            const opponents = game.players.filter(
              (p) => p.id !== player.id && game.health[p.id] > 0
            )
            if (opponents.length > 0) {
              const opponent =
                opponents[Math.floor(Math.random() * opponents.length)]
              botAttack(gameId, player.id, opponent.id)
            }
          }
        },
        Math.floor(
          Math.random() * (BOT_ATTACK_MAX_DELAY - BOT_ATTACK_MIN_DELAY + 1)
        ) + BOT_ATTACK_MIN_DELAY
      )
    }
  })
}

// Function for bot attack
const botAttack = async (gameId, botId, opponentId) => {
  const io = socketManager.getIo() // Get the io instance
  const game = games[gameId]
  if (!game || !game.health[botId]) return
  let damageDealt = 5

  // Check Opponent Loadout
  const opponentLoadout = await getLoadoutForPlayer(opponentId, gameId) // Fetch loadout for the player
  if (opponentLoadout) {
    if (opponentLoadout.prevents_damage) {
      // console.log(
      //   `Opponent ${opponentId} has a Shield Loadout. Bot does not deal damage.`,
      // )
      return { error: 'Opponent cannot take damage due to Shield Loadout' }
    }
    if (opponentLoadout.thief_effect) {
      // console.log(
      //   `Opponent ${opponentId} has a Thief Loadout. Opponent loses money.`,
      // )
      // Implement logic to deduct money from the opponent
      // For example: deductMoney(opponentId, 2);
    }
    if (opponentLoadout.money_multiplier > 1.0) {
      damageDealt *= opponentLoadout.money_multiplier // Apply the multiplier
      // console.log(
      //   `Opponent ${opponentId} earns double money. Damage dealt: ${damageDealt}`,
      // )
    }
  }

  game.health[opponentId] -= damageDealt
  game.stats[botId].damage_dealt += damageDealt
  game.stats[botId].damage_inflicted += damageDealt

  await MatchStat.increment(
    { damage_dealt: damageDealt, damage_inflicted: damageDealt },
    { where: { player_id: botId, game_id: gameId } }
  )

  updateRanks(gameId)

  game.stats[opponentId].damageReceived =
    game.stats[opponentId].damageReceived || {}
  game.stats[opponentId].damageReceived[botId] =
    (game.stats[opponentId].damageReceived[botId] || 0) + damageDealt

  if (game.health[opponentId] <= 0) {
    const damageReceived = game.stats[opponentId].damageReceived
    Object.keys(damageReceived).forEach(async (playerId) => {
      if (damageReceived[playerId] >= 30 && playerId !== botId) {
        // Grant an assist to the player
        game.stats[playerId].assists = (game.stats[playerId].assists || 0) + 1
        await MatchStat.increment(
          { assist: 1 },
          { where: { player_id: playerId, game_id: gameId } }
        )
      }
    })

    game.stats[botId].kills += 1
    game.stats[opponentId].death = 1
    // console.log(`Bot ${botId} eliminated ${opponentId} and ${opponentId}`)
    await MatchStat.increment(
      { kills: 1 },
      { where: { player_id: botId, game_id: gameId } }
    )
    await MatchStat.increment(
      { death: 1 },
      { where: { player_id: opponentId, game_id: gameId } }
    )
    checkForWinner(gameId)
  }
  // console.log(`Bot ${botId} attacked ${opponentId}`)
  io.to(`${gameId}`).emit('playerAttacked', {
    game: game,
  })
}

// Function to handle player attacks
const playerAttack = async (gameId, attackerId, targetId) => {
  let damageDealt = 5 // Base damage
  const game = games[gameId]
  if (!game) {
    console.log(`Game ${gameId} not found: Game ID: ${gameId}`)
    return { error: 'Game not found' }
  }

  // Check Opponent Loadout
  const opponentLoadout = await getLoadoutForPlayer(targetId, gameId) // Fetch loadout for the player
  if (opponentLoadout) {
    if (opponentLoadout.prevents_damage) {
      // console.log(
      //   `Opponent ${opponentId} has a Shield Loadout. Bot does not deal damage.`,
      // )
      return { error: 'Opponent cannot take damage due to Shield Loadout' }
    }
    if (opponentLoadout.thief_effect) {
      // console.log(
      //   `Opponent ${opponentId} has a Thief Loadout. Opponent loses money.`,
      // )
      // Implement logic to deduct money from the opponent
      // For example: deductMoney(opponentId, 2);
    }
    if (opponentLoadout.money_multiplier > 1.0) {
      damageDealt *= opponentLoadout.money_multiplier // Apply the multiplier
      // console.log(
      //   `Opponent ${opponentId} earns double money. Damage dealt: ${damageDealt}`,
      // )
    }
  }

  // create an object for damage received
  game.stats[targetId].damageReceived =
    game?.stats[targetId]?.damageReceived || {}
  game.stats[targetId].damageReceived[attackerId] =
    (game?.stats[targetId]?.damageReceived[attackerId] || 0) + damageDealt

  // Fetch the attacker's loadout from the database using both playerId and gameId
  const attackerLoadout = await getLoadoutForPlayer(attackerId, gameId) // Pass gameId here

  if (!game.health[attackerId]) {
    //!game.health[attackerId] attackerId could not be found
    // console.log(`Attacker health is zero. Attacker ID: ${attackerId}`)
    return { error: 'Game or player not found' }
  }

  // Check if the opponent exists and has health > 0
  const opponent = game.players.find(
    (player) => player.id === targetId && game.health[player.id] > 0
  )

  if (!opponent) {
    // console.log(
    //   `No opponent found for Target ID: ${targetId} in Game ID: ${gameId}`,
    // )
    return { error: 'No opponent found' }
  }

  // Check Attacker Loadout
  if (attackerLoadout) {
    // Check if the attacker has double attack loadout
    if (attackerLoadout?.dataValues?.id === 1) {
      damageDealt *= attackerLoadout.dataValues.damage_points // Apply the multiplier
      // console.log(
      //   `Player ${attackerId} earns double money. Damage dealt: ${damageDealt}`,
      // )
    }
    // Check if the attacker has a shield loadout
    if (attackerLoadout?.dataValues?.id === 2) {
      // console.log(
      //   `Player ${attackerId} has a Shield Loadout. Opponent does not deal damage.`,
      // )
    }

    // Check if the attacker has a Thief Loadout
    if (attackerLoadout?.dataValues?.id === 3) {
      // Check for elimination
      if (game?.health[opponent?.id] <= 5) {
        const damageReceived = game?.stats[targetId]?.damageReceived
        Object.keys(damageReceived).forEach(async (playerId) => {
          if (
            damageReceived[playerId] >= 30 &&
            playerId !== String(attackerId)
          ) {
            damageDealt *= attackerLoadout.dataValues.damage_points
            // console.log('damageDealti', damageDealt)
          } else {
          }
        })
        damageDealt *= attackerLoadout.dataValues.damage_points
        // console.log('damageDealt', damageDealt)
      }
    }
    if (attackerLoadout?.dataValues?.id === 4) {
      damageDealt = attackerLoadout.dataValues.damage_points // Apply the multiplier
      // console.log(
      //   `Player ${attackerId} airstriked ${targetId}. Damage dealt: ${damageDealt}`,
      // )
      const io = socketManager.getIo()
      io.to(`${gameId}`).emit('useAirStrikeLoadout', {})
      //delete air strike loadout from database
      try {
        await PlayerGameLoadout.destroy({
          where: {
            player_id: attackerId,
            game_id: gameId,
            loadout_id: 4,
          },
        })
        // console.log(
        //   `Loadout for player ${attackerId} in game ${gameId} deleted manually.`,
        // )
      } catch (error) {
        console.error('Error deleting PlayerGameLoadout after duration:', error)
      }
    }
  }

  // Execute attack logic
  game.health[opponent.id] -= damageDealt
  game.stats[attackerId].damage_dealt += damageDealt
  game.stats[attackerId].damage_inflicted += damageDealt

  // console.log(
  //   `Player ${attackerId} attacked ${opponent.id}. Opponent health: ${
  //     game.health[opponent.id]
  //   }`,
  // )

  await MatchStat.increment(
    { damage_dealt: damageDealt, damage_inflicted: damageDealt },
    { where: { player_id: attackerId, game_id: gameId } }
  )

  updateRanks(gameId)

  // Check for elimination
  if (game.health[opponent.id] <= 0) {
    const damageReceived = game.stats[targetId].damageReceived
    Object.keys(damageReceived).forEach(async (playerId) => {
      if (damageReceived[playerId] >= 30 && playerId !== String(attackerId)) {
        // Grant an assist to the player
        game.stats[playerId].assists = (game.stats[playerId].assists || 0) + 1
        await MatchStat.increment(
          { assist: 1 },
          { where: { player_id: playerId, game_id: gameId } }
        )
      }
    })

    game.stats[attackerId].kills += 1
    game.stats[targetId].death = 1
    // console.log(`Player ${attackerId} eliminated ${opponent.id}`)
    await MatchStat.increment(
      { kills: 1 },
      { where: { player_id: attackerId, game_id: gameId } }
    )
    await MatchStat.increment(
      { death: 1 },
      { where: { player_id: targetId, game_id: gameId } }
    )
    checkForWinner(gameId)
  }

  return {
    attackerId,
    opponentId: opponent.id,
    opponentHealth: game.health[opponent.id],
    game: game,
  }
}

const updateRanks = (gameId) => {
  const game = games[gameId]

  if (!game) {
    console.log(`Game not found: Game ID: ${gameId}. So no rank updates.`)
    return
  }

  // Get all player IDs
  const players = Object.keys(game.health)

  // Sort players by their health and kills, ignoring players with 0 health (eliminated)
  const sortedPlayers = players
    .filter((playerId) => game.health[playerId] > 0) // Only consider active players for ranking
    .sort((a, b) => {
      const healthDiff = game.health[b] - game.health[a] // Sort by health in descending order
      return healthDiff
    })

  // Assign ranks to non-eliminated players
  sortedPlayers.forEach((playerId, index) => {
    game.stats[playerId].rank = index + 1 // Update rank for active players
  })

  // Assign ranks to eliminated players
  players
    .filter((playerId) => game.health[playerId] === 0)
    .forEach((playerId) => {
      if (game.stats[playerId].death !== 1) {
        game.stats[playerId].rank = sortedPlayers.length + 1
      }
    })
}

// Function to check for winners
const checkForWinner = async (gameId) => {
  const game = games[gameId]
  const alivePlayers = game?.players.filter(
    (player) => game.health[player.id] > 0
  )

  if (alivePlayers.length === 1) {
    const winnerId = alivePlayers[0].id
    // console.log(`Game ${gameId} has a winner: ${winnerId}`)
    await endGame(gameId, winnerId)
  } else if (alivePlayers.length === 0) {
    // console.log(`Game ${gameId} ended in a draw`)
    await endGame(gameId, null) // No winner
  }
}

// Function to end the game
const endGame = async (gameId, winnerId) => {
  // console.log(`Ending game ${gameId}. Winner: ${winnerId}`)
  const game = games[gameId]
  const io = socketManager.getIo()

  const players = game.players

  for (const player of players) {
    const playerId = player.id
    const playerStats = game.stats[playerId]

    // add money_spent to game.stats
    const playerStatInDb = await MatchStat.findOne({
      where: { player_id: playerId, game_id: gameId },
    })

    if (playerStatInDb) {
      game.stats[playerId].money_spent = playerStatInDb.dataValues.money_spent
    }

    if (playerStats) {
      // Update the player's rank in the database
      await MatchStat.update(
        { rank: playerStats.rank },
        { where: { player_id: playerId, game_id: gameId } }
      )
      const user = await User.findByPk(playerId)
      if (user) {
        user.total_kills += playerStats.kills
        user.total_extracted_money += playerStats.damage_dealt
        await user.save()
      }
    }
  }

  // Update match stats for the winner
  if (winnerId) {
    await MatchStat.update(
      { is_winner: true },
      { where: { player_id: winnerId, game_id: gameId } }
    )
  }

  // Emit the endGame event
  console.log('Emitting endGame')
  io.to(`${gameId}`).emit('endGame', {
    game,
  })
  // Clean up game data
  delete games[gameId]
}

const getLoadoutForPlayer = async (playerId, gameId) => {
  try {
    // Query PlayerGameLoadout to find the entry by player_id and game_id
    const playerGameLoadout = await PlayerGameLoadout.findOne({
      where: {
        player_id: playerId,
        game_id: gameId,
      },
      include: {
        model: Loadout,
        as: 'loadout', // Use the alias defined in the PlayerGameLoadout model
      },
    })
    // Check if entry exists
    if (!playerGameLoadout) {
      return { message: 'No loadout found for the specified player and game.' }
    }
    // Return the loadout information
    return playerGameLoadout.loadout // Return the associated loadout
  } catch (error) {
    onsole.log('I am getLoadoutForPlayer error')
    console.error('Error fetching loadout:', error)
    throw error // Handle error as needed
  }
}

const clearPlayerMoney = async (userId, gameId) => {
  const game = games[gameId]
  if (game) {
    game.stats[userId].damage_dealt = 0
  }
}

module.exports = {
  games,
  createGame,
  joinGame,
  playerAttack,
  startGame,
  endGame,
  getLoadoutForPlayer,
  clearPlayerMoney,
}

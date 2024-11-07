const MatchStat = require('../models/MatchStat');
const Game = require('../models/Game');
const Player = require('../models/User');
const PlayerGameLoadout = require('../models/PlayerGameLoadout');
const Loadout = require('../models/Loadout');
const socketManager = require('../socket')

let games = {}
let botCounter = -1
const MAX_PLAYERS = 30
const INITIAL_HEALTH = 100
const BOT_JOIN_DELAY = 30000
const BOT_ATTACK_MIN_DELAY = 5000
const BOT_ATTACK_MAX_DELAY = 10000
const GAME_DURATION = 300000 // 5 minutes
const RESPAWN_TIME = 5000

const createGame = async () => {
  const game = await Game.create({})
  const gameId = game.id
  games[gameId] = {
    players: [],
    health: {},
    stats: {},
    botsAdded: false,
    timer: null,
    startTime: null,
  }

  // Set a timeout to add bots if no other player joins within the delay
  setTimeout(async () => {
    if (games[gameId].players.length < MAX_PLAYERS) {
      console.log('Adding bots to the game...')
      await addBotsToGame(gameId)
      startGame(gameId)
    }
  }, BOT_JOIN_DELAY)

  return gameId
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
      is_winner: false,
      is_bot: true,
    })

    games[gameId].health[botId] = INITIAL_HEALTH
    games[gameId].stats[botId] = { kills: 0, damage_dealt: 0 }
    games[gameId].players.push({ id: botId, isBot: true })

    console.log(`Bot ${botId} joined game ${gameId}`)
  }

  startBotActions(gameId)
}

// Function to start the bot attack logic
const startBotActions = (gameId) => {
  const game = games[gameId]

  game.players.forEach((player) => {
    if (player.isBot) {
      setInterval(() => {
        if (game.players.length > 1) {
          const opponents = game.players.filter(
            (p) => p.id !== player.id && game.health[p.id] > 0,
          )
          if (opponents.length > 0) {
            const opponent =
              opponents[Math.floor(Math.random() * opponents.length)]
            botAttack(gameId, player.id, opponent.id)
          }
        }
      }, Math.floor(Math.random() * (BOT_ATTACK_MAX_DELAY - BOT_ATTACK_MIN_DELAY + 1)) + BOT_ATTACK_MIN_DELAY)
    }
  })
}

// Function for bot attack
const botAttack = async (gameId, botId, opponentId) => {
  const game = games[gameId]
  if (!game || !game.health[botId]) return

  const opponentLoadout = await getLoadoutForPlayer(opponentId, gameId) // Fetch loadout for the player
  // console.log("LoadOut:" + opponentLoadout);
  let damageDealt = 20

  if (opponentLoadout) {
    if (opponentLoadout.prevents_damage) {
      console.log(
        `Opponent ${opponentId} has a Shield Loadout. Bot does not deal damage.`,
      )
      return { error: 'Opponent cannot take damage due to Shield Loadout' }
    }
    if (opponentLoadout.thief_effect) {
      console.log(
        `Opponent ${opponentId} has a Thief Loadout. Opponent loses money.`,
      )
    }
    if (opponentLoadout.money_multiplier > 1.0) {
      damageDealt *= opponentLoadout.money_multiplier // Apply the multiplier
      console.log(
        `Opponent ${opponentId} earns double money. Damage dealt: ${damageDealt}`,
      )
    }
  }

  game.health[opponentId] -= damageDealt
  game.stats[botId].damage_dealt += damageDealt

  await MatchStat.increment(
    { damage_dealt: damageDealt },
    { where: { player_id: botId, game_id: gameId } },
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
          { where: { player_id: playerId, game_id: gameId } },
        )
      }
    })

    game.stats[botId].kills += 1
    game.stats[opponentId].death += 1
    console.log(`Bot ${botId} eliminated ${opponentId}`)
    await MatchStat.increment(
      { kills: 1 },
      { where: { player_id: botId, game_id: gameId } },
    )
    await MatchStat.increment(
      { death: 1 },
      { where: { player_id: opponentId, game_id: gameId } },
    )
    checkForWinner(gameId, opponentId)
  }

  const io = socketManager.getIo()
  io.to(`${gameId}`).emit('playerAttacked', {
    game: { players: game.players, health: game.health, stats: game.stats },
  })
}

const joinGame = async (userId, gameId) => {
  let currentGameId = Object.keys(games).find(
    (gameId) => games[gameId].players.length < MAX_PLAYERS,
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
    is_winner: false,
  })
  const loadouts = await Loadout.findAll()
  games[currentGameId].stats[userId] = {
    kills: 0,
    assists: 0,
    death: 0,
    rank: 1,
    damage_dealt: 0,
    health: INITIAL_HEALTH,
  }
  games[currentGameId].health[userId] = INITIAL_HEALTH
  games[currentGameId].players.unshift({ id: userId })

  const game = games[currentGameId]

  // Return the player details along with the current gameId
  return {
    id: userId,
    gameId: currentGameId,
    playerStats: playerStats,
    loadouts: loadouts,
    games: { players: game.players, health: game.health, stats: game.stats },
  }
}

// Function to start the game
const startGame = (gameId) => {
  const io = socketManager.getIo()
  const game = games[gameId]
  console.log(`Game ${gameId} started with players:`, game.players)
  game.startTime = Date.now()
  game.timer = setTimeout(() => {
    endGame(gameId, null)
  }, GAME_DURATION)
  //   console.log('can setTimeout be consoled', game.timer)
  //   const stringGame = JSON.stringify(game)
  console.log('emitting game started')
  io.to(`${gameId}`).emit('gameStarted', {
    message: `Game ${gameId} has started!`,
    game: { players: game.players, health: game.health, stats: game.stats },
  })
}

const playerAttack = async (gameId, attackerId, targetId) => {
  const game = games[gameId]

  // Fetch the attacker's loadout from the database using both playerId and gameId
  const attackerLoadout = await getLoadoutForPlayer(targetId, gameId) // Pass gameId here
  console.log('Request : ' + attackerId)

  if (!game || !game.health[attackerId]) {
    console.log(
      `Game or player not found: Game ID: ${gameId}, Attacker ID: ${attackerId}`,
    )
    return { error: 'Game or player not found' }
  }

  // Check if the opponent exists and has health > 0
  const opponent = game.players.find(
    (player) => player.id === targetId && game.health[player.id] > 0,
  )

  if (!opponent) {
    console.log(
      `No opponent found for Target ID: ${targetId} in Game ID: ${gameId}`,
    )
    return { error: 'No opponent found' }
  }

  // Loadout Effects
  let damageDealt = 20 // Base damage
  if (attackerLoadout) {
    // Check if the attacker has a shield loadout
    if (attackerLoadout.prevents_damage) {
      console.log(
        `Player ${attackerId} has a Shield Loadout. Opponent does not deal damage.`,
      )
      return { error: 'Opponent cannot deal damage due to Shield Loadout' }
    }

    // Check if the attacker has a Thief Loadout
    if (attackerLoadout.thief_effect) {
      console.log(
        `Player ${attackerId} has a Thief Loadout. Attacker loses money.`,
      )
      // Implement logic to deduct money from attacker
      // For example: deductMoney(attackerId, 2);
    }

    // Check if the attacker has a Money Multiplier Loadout
    if (attackerLoadout.money_multiplier > 1.0) {
      damageDealt *= attackerLoadout.money_multiplier // Apply the multiplier
      console.log(
        `Player ${attackerId} earns double money. Damage dealt: ${damageDealt}`,
      )
    }
  }

  // Execute attack logic
  game.health[opponent.id] -= damageDealt
  game.stats[attackerId].damage_dealt += damageDealt

  console.log(
    `Player ${attackerId} attacked ${opponent.id}. Opponent health: ${
      game.health[opponent.id]
    }`,
  )

  await MatchStat.increment(
    { damage_dealt: damageDealt },
    { where: { player_id: attackerId, game_id: gameId } },
  )

  updateRanks(gameId)

  game.stats[targetId].damageReceived =
    game.stats[targetId].damageReceived || {}

  game.stats[targetId].damageReceived[attackerId] =
    (game.stats[targetId].damageReceived[attackerId] || 0) + damageDealt

  // Check for elimination
  if (game.health[opponent.id] <= 0) {
    const damageReceived = game.stats[targetId].damageReceived
    Object.keys(damageReceived).forEach(async (playerId) => {
      if (damageReceived[playerId] >= 30 && playerId !== String(attackerId)) {
        // Grant an assist to the player
        game.stats[playerId].assists = (game.stats[playerId].assists || 0) + 1
        await MatchStat.increment(
          { assist: 1 },
          { where: { player_id: playerId, game_id: gameId } },
        )
      }
    })

    game.stats[attackerId].kills += 1
    game.stats[targetId].death += 1
    console.log('player kills' + attackerId + game.stats[attackerId].kills)
    console.log(`Player ${attackerId} eliminated ${opponent.id}`)
    await MatchStat.increment(
      { kills: 1 },
      { where: { player_id: attackerId, game_id: gameId } },
    )
    await MatchStat.increment(
      { death: 1 },
      { where: { player_id: targetId, game_id: gameId } },
    )
    checkForWinner(gameId, targetId)
  }

  return {
    attackerId,
    opponentId: opponent.id,
    opponentHealth: game.health[opponent.id],
    game: { players: game.players, health: game.health, stats: game.stats },
  }
}

// Function to respawn a player after elimination
const respawnPlayer = async (gameId, playerId) => {
  const game = games[gameId]
  if (game) {
    game.health[playerId] = INITIAL_HEALTH // Reset health
    game.stats[playerId].damageReceived = {} // Reset damage received
    // game.stats[playerId] = {}; // Reset stats

    console.log(
      `Player ${playerId} respawned in game ${gameId} with ${INITIAL_HEALTH} health`,
    )
    await MatchStat.update(
      { damage_dealt: 0 }, // Reset damage dealt for this respawn
      { where: { player_id: playerId, game_id: gameId } },
    )
  }
}

// Function to check for a winner
const checkForWinner = async (gameId, eliminatedPlayerId) => {
  const game = games[gameId]
  const playersRemaining = game.players.filter(
    (player) => game.health[player.id] > 0,
  )

  // If there's only one player left
  if (playersRemaining.length === -1) {
    //  I changed it to -1 to make it never run, please replace it with appropriate logic
    const winner = playersRemaining[0]
    console.log(
      `Player ${winner.id} wins game ${gameId} as the last player remaining.`,
    )
    await MatchStat.update(
      { is_winner: true },
      { where: { player_id: winner.id, game_id: gameId } },
    )
    endGame(gameId, winner.id)
  } else {
    // Respawn logic
    setTimeout(() => respawnPlayer(gameId, eliminatedPlayerId), RESPAWN_TIME)
  }
}

// Function to end the game
const endGame = async (gameId, winnerId) => {
  const game = games[gameId]
  if (game.timer) {
    clearTimeout(game.timer)
  }

  const players = game.players

  for (const player of players) {
    const playerId = player.id
    const playerStats = game.stats[playerId]

    if (playerStats) {
      // Update the player's rank in the database
      await MatchStat.update(
        { rank: playerStats.rank },
        { where: { player_id: playerId, game_id: gameId } },
      )
    }
  }

  const statsArray = Object.entries(game.stats)
  const maxKillPlayer = statsArray.reduce(
    (maxPlayer, [playerId, stat]) => {
      console.log(
        `Comparing ${playerId} with ${stat.kills} to ${maxPlayer.id} with ${maxPlayer.kills}`,
      )
      return stat.kills > maxPlayer.kills
        ? { id: playerId, kills: stat.kills }
        : maxPlayer
    },
    { id: null, kills: 0 },
  ) // Changed initial kills to 0

  console.log('Max Kill Player:', maxKillPlayer)

  // If there's a winner based on kills, update is_winner
  if (maxKillPlayer.id) {
    console.log(
      `Player ${maxKillPlayer.id} wins game ${gameId} with ${maxKillPlayer.kills} kills.`,
    )
    await MatchStat.update(
      { is_winner: true },
      { where: { player_id: maxKillPlayer.id, game_id: gameId } },
    )
  }

  const io = socketManager.getIo()
  io.to(`${gameId}`).emit('endGame', {
    game: games[gameId],
  })

  console.log(`Game ${gameId} ended. Winner: ${maxKillPlayer.id}`)
  delete games[gameId] // Clean up the game
}

// Helper function to get loadout for a player
const getLoadoutForPlayer = async (playerId, gameId) => {
  const loadout = await PlayerGameLoadout.findOne({
    where: { player_id: playerId },
    include: [{ model: Loadout, as: 'loadout' }],
  })

  return loadout ? loadout.loadout : null
}

const updateRanks = (gameId) => {
  const game = games[gameId]

  // Get all player IDs
  // const players = Object.keys(game.health);
  const players = Object.keys(game.stats)

  // Sort players by kill count first, and then by damage dealt in case of a tie
  const sortedPlayers = players
    // .filter((playerId) => game.health[playerId] > 0) // Only consider active players for ranking
    .sort((a, b) => {
      // Primary sort: by kills (descending)
      const killsDiff = (game.stats[b].kills || 0) - (game.stats[a].kills || 0)
      if (killsDiff !== 0) return killsDiff

      // Secondary sort (if kills are the same): by damage dealt (descending)
      const damageDiff =
        (game.stats[b].damage_dealt || 0) - (game.stats[a].damage_dealt || 0)
      return damageDiff
    })

  // Assign ranks to non-eliminated players based on the sorted order
  sortedPlayers.forEach((playerId, index) => {
    game.stats[playerId].rank = index + 1 // Update rank for active players (1-based index)
  })

  // Assign ranks to eliminated players (players with 0 health) at the end
  // players
  //   .filter((playerId) => game.health[playerId] === 0)
  //   .forEach((playerId) => {
  //     // If player is eliminated and hasn't been ranked yet, assign them the last rank
  //     if (game.stats[playerId].rank === undefined) {
  //       game.stats[playerId].rank = sortedPlayers.length + 1;
  //     }
  //   });
}




module.exports = {
    createGame,
    joinGame,
    playerAttack,
    getLoadoutForPlayer
};

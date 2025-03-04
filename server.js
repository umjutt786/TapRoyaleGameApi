const express = require('express')
const dotenv = require('dotenv')
const sequelize = require('./config/database')
const authRoutes = require('./routes/authRoutes') // Import auth routes
const countryRoutes = require('./routes/countryRoutes') // Import country routes
const responseFormatter = require('./middlewares/responseFormatter') // Import response formatter
const gameRoutes = require('./routes/gameRoutes')
const loadoutsRoute = require('./routes/loadouts')
const http = require('http')
const socketIo = require('socket.io')
const GameController = require('./controllers/GameController') // Import GameController for socket use
const deathMatchController = require('./controllers/deathMatchController') // Import deathMatchController for socket use
const deathMatchRoute = require('./routes/deathMatchRoutes') // Import GameController for socket use
const playerGameLoadoutsRoute = require('./routes/playerGameLoadouts')
const leaderBoardRoute = require('./routes/leaderBoardRoute')
const Loadout = require('./models/Loadout')
const PlayerGameLoadout = require('./models/PlayerGameLoadout')
const socketManager = require('./socket')

// Define associations
Loadout.hasMany(PlayerGameLoadout, {
  foreignKey: 'loadout_id',
  as: 'playerGameLoadouts',
})

dotenv.config()

const app = express()

app.use(express.json()) // Parse JSON bodies
app.use(responseFormatter) // Use response formatter middleware
const server = http.createServer(app)
app.use('/api/auth', authRoutes) // Use auth routes
app.use('/api/countries', countryRoutes) // Use country routes
app.use('/api/loadouts', loadoutsRoute)
app.use('/api/games', gameRoutes) // Use game routes
app.use('/api/games', playerGameLoadoutsRoute) // Use player game loadouts route
app.use('/api/games', deathMatchRoute) // Use player game loadouts route
app.use('/api/leaderboard', leaderBoardRoute)

const io = socketIo(server, {
  maxHttpBufferSize: 4 * 1024 * 1024, // 4 MB buffer size
  connectionStateRecovery: {},
})
socketManager.setIo(io) // Set the io instance

// Socket connection logic
io.on('connection', (socket) => {
  socket.on('joinBR', async ({ userId }) => {
    // socket.on('joinBR', async ({ userId }, callback) => {
    // callback('joinBR recieved')
    const player = await GameController.joinGame(userId)

    if (player.error) {
      socket.emit('error', player.error) // Notify player if there was an error
    } else {
      socket.playerId = player.id // Store the playerId in the socket session
      console.log(
        `Player ${player.id} joined game with room ID: ${player.gameId}`
      ) // Debug log to confirm player joined
      socket.join(`${player.gameId}`) // Join socket room for the game

      // Emit to the player who just joined, sending back the gameId
      io.to(`${player.gameId}`).emit('gameJoined', {
        player: player.user,
        gameId: player.gameId,
        playerStats: player.playerStats,
        loadouts: player.loadouts,
        games: player.games,
      })
    }
  })
  socket.on('joinDM', async ({ userId }) => {
    const player = await deathMatchController.joinGame(userId)

    if (player.error) {
      socket.emit('error', player.error) // Notify player if there was an error
    } else {
      socket.playerId = player.id // Store the playerId in the socket session
      console.log(
        `Player ${player.id} joined game with room ID: ${player.gameId}`
      ) // Debug log to confirm player joined
      socket.join(`${player.gameId}`) // Join socket room for the game

      // Emit to the player who just joined, sending back the gameId
      io.to(`${player.gameId}`).emit('gameJoined', {
        player: player.user,
        gameId: player.gameId,
        playerStats: player.playerStats,
        loadouts: player.loadouts,
        games: player.games,
      })
    }
  })

  socket.on('attackBR', async (data) => {
    const playerId = data.playerId
    const gameId = data.gameId
    const targetId = data.targetId

    if (!playerId) {
      return socket.emit('error', 'Player ID is not set.')
    }

    // console.log(
    //   `Player ${playerId} is attacking target ${targetId} in game ${gameId}`,
    // ) // Debugging log
    const result = await GameController.playerAttack(gameId, playerId, targetId)

    if (result.error) {
      socket.emit('error', result.error)
    } else {
      io.to(`${gameId}`).emit('playerAttacked', {
        game: result.game,
      })
    }
  })

  socket.on('attackDM', async (data) => {
    const playerId = data.playerId
    const gameId = data.gameId
    const targetId = data.targetId

    if (!playerId) {
      return socket.emit('error', 'Player ID is not set.')
    }

    // console.log(
    //   `Player ${playerId} is attacking target ${targetId} in game ${gameId}`,
    // ) // Debugging log
    const result = await deathMatchController.playerAttack(
      gameId,
      playerId,
      targetId
    )

    if (result.error) {
      socket.emit('error', result.error)
    } else {
      io.to(`${gameId}`).emit('playerAttacked', {
        game: result.game,
      })
    }
  })

  socket.on('exitGameBR', async (data) => {
    await GameController.clearPlayerMoney(data.userId, data.gameId)
  })

  socket.on('exitGameDM', async (data) => {
    await deathMatchController.clearPlayerMoney(data.userId, data.gameId)
  })

  // When a player disconnects
  socket.on('disconnect', () => {
    if (socket.playerId) {
      console.log('This player disconnected: ' + socket.playerId)
    } else {
      console.log('Some player disconnected')
    }
    const gameId = Object.keys(socket.rooms).find((room) => room !== socket.id)
    if (gameId) {
      io.to(`${gameId}`).emit('playerDisconnected', {
        playerId: socket.playerId,
      })
    }
  })
})

// Database connection and server initialization
sequelize
  .sync()
  .then(() => {
    console.log('Database synced successfully.')
  })
  .catch((err) => {
    console.error('Error syncing database:', err)
  })

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

app.get('/api', (req, res) => {
  console.log('API hit at', new Date().toLocaleTimeString())
  res.json([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ])
})

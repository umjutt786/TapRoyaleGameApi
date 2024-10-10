const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const countryRoutes = require('./routes/countryRoutes'); // Import country routes
const responseFormatter = require('./middlewares/responseFormatter'); // Import response formatter
const gameRoutes = require('./routes/gameRoutes');
const http = require('http');
const socketIo = require('socket.io');
const GameController = require('./controllers/GameController'); // Import GameController for socket use

dotenv.config();

const app = express();

app.use(express.json()); // Parse JSON bodies
app.use(responseFormatter); // Use response formatter middleware
const server = http.createServer(app);
const io = socketIo(server);

app.use('/api/auth', authRoutes); // Use auth routes
app.use('/api/countries', countryRoutes); // Use country routes
app.use('/api/games', gameRoutes); // Use game routes

// Socket connection logic
io.on('connection', (socket) => {
    console.log('A player connected');

    // Join game event with userId and gameId
    socket.on('joinGame', async ({ userId, gameId }) => {
        const player = await GameController.joinGame(userId);
        if (player.error) {
            socket.emit('error', player.error); // Notify player if there was an error
        } else {
            socket.playerId = player.id; // Store the playerId in the socket session
            socket.join(gameId); // Join socket room for the game
            io.to(gameId).emit('playerJoined', player); // Notify all players in game

            // Check if game is full (2 players for now)
            const game = await GameController.getGameById(gameId);
            if (game.players.length === 2) {
                io.to(gameId).emit('gameReady', { gameId }); // Notify players game is ready
                GameController.startGame(gameId); // Start the game
            }
        }
    });

    // Attack event
    socket.on('attack', async () => {
        const playerId = socket.playerId; // Use the playerId stored in the socket session
        const gameId = Object.keys(socket.rooms).find((room) => room !== socket.id); // Get the gameId

        const result = await GameController.playerAttack(gameId, playerId);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            io.to(gameId).emit('playerAttacked', result); // Broadcast attack result to all players
        }
    });

    // When a player disconnects
    socket.on('disconnect', () => {
        console.log('A player disconnected');
        const gameId = Object.keys(socket.rooms).find((room) => room !== socket.id);
        if (gameId) {
            io.to(gameId).emit('playerDisconnected', { playerId: socket.playerId });
        }
    });
});

// Database connection and server initialization
sequelize.sync()
    .then(() => {
        console.log('Database synced successfully.');
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

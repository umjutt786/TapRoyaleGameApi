const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const countryRoutes = require('./routes/countryRoutes'); // Import country routes
const responseFormatter = require('./middlewares/responseFormatter'); // Import response formatter
const gameRoutes = require('./routes/gameRoutes');
const loadoutsRoute = require('./routes/loadouts');
const http = require('http');
const socketIo = require('socket.io');
const GameController = require('./controllers/GameController'); // Import GameController for socket use
const deathMatchRoute = require('./routes/deathMatchRoutes'); // Import GameController for socket use
const playerGameLoadoutsRoute = require('./routes/playerGameLoadouts');
const Loadout = require('./models/Loadout');
const PlayerGameLoadout = require('./models/PlayerGameLoadout');


// Define associations
Loadout.hasMany(PlayerGameLoadout, {
    foreignKey: 'loadout_id',
    as: 'playerGameLoadouts',
});


dotenv.config();

const app = express();

app.use(express.json()); // Parse JSON bodies
app.use(responseFormatter); // Use response formatter middleware
const server = http.createServer(app);
const io = socketIo(server);

app.use('/api/auth', authRoutes); // Use auth routes
app.use('/api/countries', countryRoutes); // Use country routes
app.use('/api/loadouts', loadoutsRoute);
app.use('/api/games', gameRoutes); // Use game routes
app.use('/api/games', playerGameLoadoutsRoute); // Use player game loadouts route
app.use('/api/games', deathMatchRoute); // Use player game loadouts route


// Socket connection logic
io.on('connection', (socket) => {
    console.log('A player connected');
// socket.on('joinGame', async ({ userId, gameId }) => {
//     const player = await GameController.joinGame(userId);
//     if (player.error) {
//         socket.emit('error', player.error); // Notify player if there was an error
//     } else {
//         socket.playerId = player.id; // Store the playerId in the socket session
//         console.log(`Player ${player.id} joined game ${gameId}`); // Debug log to confirm player joined
//         socket.join(gameId); // Join socket room for the game
//         io.to(gameId).emit('playerJoined', player); // Notify all players in game

//         // Get the current game state and check the number of players
//         const game = await GameController.getGameById(gameId);
        
//         // Update this to 5 if your game needs 5 players to start
//         if (game.players.length === 30) {
//             io.to(gameId).emit('gameReady', { gameId }); // Notify players game is ready
//             GameController.startGame(gameId); // Start the game
//         }
//     }
// });

    
// Attack event

socket.on('joinGame', async ({ userId }) => {
    const player = await GameController.joinGame(userId);
    
    if (player.error) {
        socket.emit('error', player.error); // Notify player if there was an error
    } else {
        socket.playerId = player.id; // Store the playerId in the socket session
        console.log(`Player ${player.id} joined game ${player.gameId}`); // Debug log to confirm player joined
        socket.join(player.gameId); // Join socket room for the game

        // Emit to the player who just joined, sending back the gameId
        socket.emit('gameJoined', { gameId: player.gameId,playerStats:player.playerStats,loadouts:player.loadouts });

        // Notify all players in the game about the new player
        io.to(player.gameId).emit('playerJoined', player); 

        // Get the current game state and check the number of players
        const game = await GameController.getGameById(player.gameId);

        if (game.players.length === 30) {
            io.to(player.gameId).emit('gameReady', { gameId: player.gameId }); // Notify all players game is ready
            GameController.startGame(player.gameId); // Start the game
        }
    }
});


socket.on('attack', async (data) => {
    const playerId = socket.playerId;
    console.log(`Player ID from socket: ${playerId}`);

    if (!playerId) {
        return socket.emit('error', 'Player ID is not set.');
    }

    const gameId = Object.keys(socket.rooms).find((room) => room !== socket.id); // Get the gameId
    console.log(`Game ID from socket rooms: ${gameId}`); // Debugging log

    if (!gameId) {
        return socket.emit('error', 'Game ID not found.');
    }

    const targetId = data.targetId; // Get targetId from the incoming data
    console.log(`Player ${playerId} is attacking target ${targetId} in game ${gameId}`); // Debugging log
    const result = await GameController.playerAttack(gameId, playerId, targetId);

    if (result.error) {
        socket.emit('error', result.error);
    } else {
        io.to(gameId).emit('playerAttacked', result);
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

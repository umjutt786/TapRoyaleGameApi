const MatchStat = require('../models/MatchStat');
const Game = require('../models/Game');
const Player = require('../models/User');
const PlayerGameLoadout = require('../models/PlayerGameLoadout');
const Loadout = require('../models/Loadout');
const socketManager = require('../socket'); // Import the socket manager


let games = {};
let botCounter = -1;
const MAX_PLAYERS = 30;
const INITIAL_HEALTH = 100;
const BOT_JOIN_DELAY = 10000;
const BOT_ATTACK_MIN_DELAY = 2000;
const BOT_ATTACK_MAX_DELAY = 5000;

// Function to create a new game
const createGame = async () => {
    const game = await Game.create({});
    const gameId = game.id;
    games[gameId] = {
        players: [],
        health: {},
        stats: {},
        botsAdded: false
    };

    // Set a timeout to add bots if no other player joins within the delay
    setTimeout(async () => {
        if (games[gameId].players.length < MAX_PLAYERS) {
            console.log("Adding bots to the game...");
            await addBotsToGame(gameId);
            startGame(gameId);
        }
    }, BOT_JOIN_DELAY);

    return gameId;
};

// Function to add bots to the game
const addBotsToGame = async (gameId) => {
    while (games[gameId].players.length < MAX_PLAYERS) {
        botCounter--;
        const botId = botCounter;

        await MatchStat.create({
            player_id: botId,
            game_id: gameId,
            kills: 0,
            damage_dealt: 0,
            is_winner: false,
            is_bot: true
        });

        games[gameId].health[botId] = INITIAL_HEALTH;
        games[gameId].stats[botId] = { kills: 0, damage_dealt: 0 };
        games[gameId].players.push({ id: botId, isBot: true });

        console.log(`Bot ${botId} joined game ${gameId}`);
    }

    startBotActions(gameId);
};

// Function to start the bot attack logic
const startBotActions = (gameId) => {
    const game = games[gameId];

    game.players.forEach(player => {
        if (player.isBot) {
            setInterval(() => {
                if (game.players.length > 1) {
                    const opponents = game.players.filter(p => p.id !== player.id && game.health[p.id] > 0);
                    if (opponents.length > 0) {
                        const opponent = opponents[Math.floor(Math.random() * opponents.length)];
                        botAttack(gameId, player.id, opponent.id);
                    }
                }
            }, Math.floor(Math.random() * (BOT_ATTACK_MAX_DELAY - BOT_ATTACK_MIN_DELAY + 1)) + BOT_ATTACK_MIN_DELAY);
        }
    });
};

// Function for bot attack
const botAttack = async (gameId, botId, opponentId) => {
    const io = socketManager.getIo(); // Get the io instance
    const game = games[gameId];
    if (!game || !game.health[botId]) return;
    const opponentLoadout = await getLoadoutForPlayer(opponentId, gameId); // Fetch loadout for the player
    let damageDealt = 5;
    if(opponentLoadout){
        if (opponentLoadout.prevents_damage) {
            console.log(`Opponent ${opponentId} has a Shield Loadout. Bot does not deal damage.`);
            return { error: 'Opponent cannot take damage due to Shield Loadout' };
        }
        if (opponentLoadout.thief_effect) {
            console.log(`Opponent ${opponentId} has a Thief Loadout. Opponent loses money.`);
            // Implement logic to deduct money from the opponent
            // For example: deductMoney(opponentId, 2);
        }
        if (opponentLoadout.money_multiplier > 1.0) {
            damageDealt *= opponentLoadout.money_multiplier; // Apply the multiplier
            console.log(`Opponent ${opponentId} earns double money. Damage dealt: ${damageDealt}`);
        }
    }

    game.health[opponentId] -= damageDealt;
    game.stats[botId].damage_dealt += damageDealt;


    await MatchStat.increment(
        { damage_dealt: damageDealt },
        { where: { player_id: botId, game_id: gameId } }
    );

    if (game.health[opponentId] <= 0) {
        game.stats[botId].kills += 1;
        console.log(`Bot ${botId} eliminated ${opponentId}`);
        await MatchStat.increment(
            { kills: 1 },
            { where: { player_id: botId, game_id: gameId } }
        );
        checkForWinner(gameId);
    }
    console.log(`Bot ${botId} attacked ${opponentId}`);
    io.to(`${gameId}`).emit('playerAttacked', {
        game: game,
    });
};

const joinGame = async (userId) => {
    let currentGameId = Object.keys(games).find(gameId => games[gameId].players.length < MAX_PLAYERS);

    // If no game is available, create a new game
    if (!currentGameId) {
        currentGameId = await createGame(); // Create a new game if none is available
    }

    // Fetch the user to check if they exist
    const user = await Player.findOne({ where: { id: userId } });
    if (!user) {
        return { error: 'User not found' };
    }

    // Ensure the player is not already in the game
    const existingStat = await MatchStat.findOne({ where: { player_id: userId, game_id: currentGameId } });
    if (existingStat) {
        return { error: 'Player is already in the game' };
    }

    // Check the current player count in the game
    const playerCount = await MatchStat.count({ where: { game_id: currentGameId } });
    if (playerCount >= MAX_PLAYERS) {
        return { error: 'Game is full' }; // If game is full, return error
    }

    // Add the player to the game
    const playerStats =  await MatchStat.create({
        player_id: userId,
        game_id: currentGameId,
        kills: 0,
        damage_dealt: 0,
        is_winner: false
    });
    const loadouts = await Loadout.findAll();
    games[currentGameId].stats[userId] = { kills: 0, assits:0, death:0, rank:1, damage_dealt: 0, health: INITIAL_HEALTH };
    games[currentGameId].health[userId] = INITIAL_HEALTH;
    games[currentGameId].players.unshift({ id: userId });

    console.log(`Player ${userId} joined game ${currentGameId}`);
    
    // Return the player details along with the current gameId
    return { id: userId, gameId: currentGameId, playerStats: playerStats,loadouts:loadouts,games:games};
};


// Function to start the game
const startGame = (gameId) => {
    const io = socketManager.getIo(); // Get the io instance
    const game = games[gameId];
    console.log("room id" + gameId);
    console.log(`Game ${gameId} started with players:`, game.players);
    io.to(`${gameId}`).emit('gameStarted', {
        message: `Game ${gameId} has started!`,
        game: game,
    });
};

// Function to handle player attacks
// const playerAttack = async (gameId, attackerId, targetId) => {
//     const game = games[gameId];
//     console.log("Request : " + attackerId);
//     if (!game || !game.health[attackerId]) {
//         console.log(`Game or player not found: Game ID: ${gameId}, Attacker ID: ${attackerId}`);
//         return { error: 'Game or player not found' };
//     }

//     // Check if the opponent exists and has health > 0
//     const opponent = game.players.find(player => player.id === targetId && game.health[player.id] > 0);
//     if (!opponent) {
//         console.log(`No opponent found for Target ID: ${targetId} in Game ID: ${gameId}`);
//         return { error: 'No opponent found' };
//     }

//     // Execute attack logic
//     game.health[opponent.id] -= 20;
//     game.stats[attackerId].damage_dealt += 20;

//     console.log(`Player ${attackerId} attacked ${opponent.id}. Opponent health: ${game.health[opponent.id]}`);

//     await MatchStat.increment(
//         { damage_dealt: 20 },
//         { where: { player_id: attackerId, game_id: gameId } }
//     );

//     // Check for elimination
//     if (game.health[opponent.id] <= 0) {
//         game.stats[attackerId].kills += 1;
//         console.log(`Player ${attackerId} eliminated ${opponent.id}`);
//         await MatchStat.increment(
//             { kills: 1 },
//             { where: { player_id: attackerId, game_id: gameId } }
//         );
//         checkForWinner(gameId);
//     }

//     return { attackerId, opponentId: opponent.id, opponentHealth: game.health[opponent.id] };
// };

// Function to handle player attacks
const playerAttack = async (gameId, attackerId, targetId) => {
    const game = games[gameId];

    // Fetch the attacker's loadout from the database using both playerId and gameId
    const attackerLoadout = await getLoadoutForPlayer(targetId, gameId); // Pass gameId here
    console.log("Request : " + attackerId);
    
    if (!game || !game.health[attackerId]) {
        console.log(`Game or player not found: Game ID: ${gameId}, Attacker ID: ${attackerId}`);
        return { error: 'Game or player not found' };
    }

    // Check if the opponent exists and has health > 0
    const opponent = game.players.find(player => player.id === targetId && game.health[player.id] > 0);
    
    if (!opponent) {
        console.log(`No opponent found for Target ID: ${targetId} in Game ID: ${gameId}`);
        return { error: 'No opponent found' };
    }

    // Loadout Effects
    let damageDealt = 5; // Base damage
    if (attackerLoadout) {
        // Check if the attacker has a shield loadout
        if (attackerLoadout.prevents_damage) {
            console.log(`Player ${attackerId} has a Shield Loadout. Opponent does not deal damage.`);
            return { error: 'Opponent cannot deal damage due to Shield Loadout' };
        }

        // Check if the attacker has a Thief Loadout
        if (attackerLoadout.thief_effect) {
            console.log(`Player ${attackerId} has a Thief Loadout. Attacker loses money.`);
            // Implement logic to deduct money from attacker
            // For example: deductMoney(attackerId, 2);
        }

        // Check if the attacker has a Money Multiplier Loadout
        if (attackerLoadout.money_multiplier > 1.0) {
            damageDealt *= attackerLoadout.money_multiplier; // Apply the multiplier
            console.log(`Player ${attackerId} earns double money. Damage dealt: ${damageDealt}`);
        }
    }

    // Execute attack logic
    game.health[opponent.id] -= damageDealt;
    game.stats[attackerId].damage_dealt += damageDealt;

    console.log(`Player ${attackerId} attacked ${opponent.id}. Opponent health: ${game.health[opponent.id]}`);

    await MatchStat.increment(
        { damage_dealt: damageDealt },
        { where: { player_id: attackerId, game_id: gameId } }
    );

    // Check for elimination
    if (game.health[opponent.id] <= 0) {
        game.stats[attackerId].kills += 1;
        console.log(`Player ${attackerId} eliminated ${opponent.id}`);
        await MatchStat.increment(
            { kills: 1 },
            { where: { player_id: attackerId, game_id: gameId } }
        );
        checkForWinner(gameId);
    }

    return { attackerId, opponentId: opponent.id, opponentHealth: game.health[opponent.id],game:game };
};








// Function to check for winners
const checkForWinner = async (gameId) => {
    const game = games[gameId];
    const alivePlayers = game.players.filter(player => game.health[player.id] > 0);

    if (alivePlayers.length === 1) {
        const winnerId = alivePlayers[0].id;
        console.log(`Game ${gameId} has a winner: ${winnerId}`);
        await endGame(gameId, winnerId);
    } else if (alivePlayers.length === 0) {
        console.log(`Game ${gameId} ended in a draw`);
        await endGame(gameId, null); // No winner
    }
};

// Function to end the game
const endGame = async (gameId, winnerId) => {
    console.log(`Ending game ${gameId}. Winner: ${winnerId}`);
    const gameStats = games[gameId];
    delete games[gameId];

    // Update match stats for the winner
    if (winnerId) {
        await MatchStat.update(
            { is_winner: true },
            { where: { player_id: winnerId, game_id: gameId } }
        );
    }

    // Clean up game data
    delete games[gameId];
};

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
        });

        // Check if entry exists
        if (!playerGameLoadout) {
            return { message: 'No loadout found for the specified player and game.' };
        }

        // Return the loadout information
        return playerGameLoadout.loadout; // Return the associated loadout
    } catch (error) {
        console.error('Error fetching loadout:', error);
        throw error; // Handle error as needed
    }
};

const getGameById = async(gameId) =>{
    try {
        // Assuming you have a Game model that interacts with the database
        const game = await Game.findOne(gameId);
        
        if (!game) {
            return { error: 'Game not found' };
        }
    
        // Return the game details, including the players
        return game;
    } catch (error) {
        console.error(`Error fetching game by ID: ${error.message}`);
        return { error: 'Error fetching game' };
    }
};


module.exports = {
    createGame,
    joinGame,
    playerAttack,
    startGame,
    endGame,
    getLoadoutForPlayer,
    getGameById
};

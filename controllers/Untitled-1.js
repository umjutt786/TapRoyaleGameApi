const MatchStat = require('../models/MatchStat');
const Game = require('../models/Game');
const Player = require('../models/User');

let games = {};
let botCounter = -1;
const MAX_PLAYERS = 5;
const INITIAL_HEALTH = 100;
const BOT_JOIN_DELAY = 30000;
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
    const game = games[gameId];
    if (!game || !game.health[botId]) return;

    game.health[opponentId] -= 20;
    game.stats[botId].damage_dealt += 20;

    console.log(`Bot ${botId} attacked ${opponentId}. Opponent health: ${game.health[opponentId]}`);

    await MatchStat.increment(
        { damage_dealt: 20 },
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
};

// Function to handle player joining the game
const joinGame = async (userId) => {
    let currentGameId = Object.keys(games).find(gameId => games[gameId].players.length < MAX_PLAYERS);
    if (!currentGameId) {
        currentGameId = await createGame();
    }

    const user = await Player.findOne({ where: { id: userId } });
    if (!user) {
        return { error: 'User not found' };
    }

    const playerCount = await MatchStat.count({ where: { game_id: currentGameId } });
    if (playerCount >= MAX_PLAYERS) {
        return { error: 'Game is full' };
    }

    const existingStat = await MatchStat.findOne({ where: { player_id: userId, game_id: currentGameId } });
    if (existingStat) {
        return { error: 'Player is already in the game' };
    }

    await MatchStat.create({
        player_id: userId,
        game_id: currentGameId,
        kills: 0,
        damage_dealt: 0,
        is_winner: false
    });

    games[currentGameId].stats[userId] = { kills: 0, damage_dealt: 0 };
    games[currentGameId].health[userId] = INITIAL_HEALTH;
    games[currentGameId].players.push({ id: userId });

    console.log(`Player ${userId} joined game ${currentGameId}`);
    return { id: userId, health: INITIAL_HEALTH };
};

// Function to start the game
const startGame = (gameId) => {
    const game = games[gameId];
    console.log(`Game ${gameId} started with players:`, game.players);
    // Additional logic to handle game starting
};

// Function to handle player attacks
const playerAttack = async (gameId, attackerId) => {
    const game = games[gameId];
    if (!game || !game.health[attackerId]) return { error: 'Game or player not found' };

    const opponent = game.players.find(player => player.id !== attackerId && game.health[player.id] > 0);
    if (!opponent) return { error: 'No opponent found' };

    game.health[opponent.id] -= 20;
    game.stats[attackerId].damage_dealt += 20;

    console.log(`Player ${attackerId} attacked ${opponent.id}. Opponent health: ${game.health[opponent.id]}`);

    await MatchStat.increment(
        { damage_dealt: 20 },
        { where: { player_id: attackerId, game_id: gameId } }
    );

    if (game.health[opponent.id] <= 0) {
        game.stats[attackerId].kills += 1;
        console.log(`Player ${attackerId} eliminated ${opponent.id}`);
        await MatchStat.increment(
            { kills: 1 },
            { where: { player_id: attackerId, game_id: gameId } }
        );
        checkForWinner(gameId);
    }

    return { attackerId, opponentId: opponent.id, opponentHealth: game.health[opponent.id] };
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

module.exports = {
    createGame,
    joinGame,
    playerAttack,
    startGame,
    endGame
};

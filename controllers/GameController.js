const Player = require('../models/User');
const Game = require('../models/Game');
const MatchStat = require('../models/MatchStat');

let games = {};
const MAX_PLAYERS = 2; // Limit to 2 players
const INITIAL_HEALTH = 100;

// Function to create a new game and set currentGameId
const createGame = async () => {
    const game = await Game.create({});
    currentGameId = game.id; // Store the ID of the newly created game
    games[currentGameId] = {
        players: [],
        health: {},
        stats: {},
    };
    return currentGameId; // Return the newly created game ID
};

const joinGame = async (userId) => {
    if (!currentGameId) {
        currentGameId = await createGame(); // Create game if not exists
    }

    // Check if user exists
    const user = await Player.findOne({ where: { id: userId } });
    if (!user) {
        return { error: 'User not found' };
    }

    // Count players in match_stats
    const playerCount = await MatchStat.count({ where: { game_id: currentGameId } });
    const MAX_PLAYERS = 2;
    if (playerCount >= MAX_PLAYERS) {
        return { error: 'Game is full' };
    }

    // Check if player is already in the game
    const existingStat = await MatchStat.findOne({ where: { player_id: userId, game_id: currentGameId } });
    if (existingStat) {
        return { error: 'Player is already in the game' };
    }

    // Add player to match_stats
    await MatchStat.create({ player_id: userId, game_id: currentGameId, kills: 0, damage_dealt: 0 });

    // Initialize player stats and health
    games[currentGameId].stats[userId] = { kills: 0, damage_dealt: 0 };
    games[currentGameId].health[userId] = INITIAL_HEALTH;

    // **Add player to the game**
    games[currentGameId].players.push({ id: userId });

    return { id: userId, health: INITIAL_HEALTH };
};




const startGame = (gameId) => {
    const game = games[gameId];
    console.log(`Game ${gameId} started with players:`, game.players);
};

const playerAttack = (gameId, attackerId) => {
    const game = games[gameId];
    if (!game || !game.health[attackerId]) return { error: 'Game or player not found' };

    // Find the opponent (the other player in the game)
    const opponent = game.players.find(player => player.id !== attackerId);
    if (!opponent) return { error: 'No opponent found' };

    // Attack: reduce opponent's health by 1
    game.health[opponent.id] -= 20;
    game.stats[attackerId].damage_dealt += 20;

    console.log(`Player ${attackerId} attacked player ${opponent.id}. Opponent health: ${game.health[opponent.id]}`);

    // Check if the opponent is eliminated
    if (game.health[opponent.id] <= 0) {
        game.stats[attackerId].kills += 1;
        console.log(`Player ${attackerId} eliminated player ${opponent.id}`);
        endGame(gameId, attackerId); // End the game when a player is eliminated
    }

    return { attackerId, opponentId: opponent.id, opponentHealth: game.health[opponent.id] };
};


const endGame = async (gameId, winnerId) => {
    const game = games[gameId];
    if (!game) return { error: 'Game not found' };
     // Update the ended_at timestamp in the games table
     await Game.update(
        { ended_at: new Date() }, // Current timestamp
        { where: { id: gameId } } // Update condition
    );
    for (const player of game.players) {
        const stats = game.stats[player.id];

        // Check if the match stats already exist for this player and game
        const existingStats = await MatchStat.findOne({
            where: {
                player_id: player.id,
                game_id: gameId
            }
        });

        if (existingStats) {
            // Update existing stats
            await MatchStat.update({
                kills: stats.kills,
                damage_dealt: stats.damage_dealt,
                is_winner: player.id === winnerId, // Update winner status
            }, {
                where: {
                    player_id: player.id,
                    game_id: gameId
                }
            });
        } else {
            // Create a new entry if no existing stats found
            await MatchStat.create({
                player_id: player.id,
                game_id: gameId,
                kills: stats.kills,
                damage_dealt: stats.damage_dealt,
                is_winner: player.id === winnerId, // The winner is the player who eliminated the other
            });
        }
    }

    console.log(`Game ${gameId} ended. Winner: Player ${winnerId}`);
    delete games[gameId]; // Clean up the game data
};


module.exports = {
    createGame,
    joinGame,
    playerAttack,
    endGame,
};

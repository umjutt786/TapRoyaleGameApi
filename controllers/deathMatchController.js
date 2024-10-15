const MatchStat = require('../models/MatchStat');
const Game = require('../models/Game');
const Player = require('../models/User');
const PlayerGameLoadout = require('../models/PlayerGameLoadout');
const Loadout = require('../models/Loadout');

let games = {};
let botCounter = -1;
const MAX_PLAYERS = 30;
const INITIAL_HEALTH = 100;
const BOT_JOIN_DELAY = 30000;
const BOT_ATTACK_MIN_DELAY = 2000;
const BOT_ATTACK_MAX_DELAY = 5000;
const GAME_DURATION = 30000;
const RESPAWN_TIME = 5000;

const createGame = async () => {
    const game = await Game.create({});
    const gameId = game.id;
    games[gameId] = {
        players: [],
        health: {},
        stats: {},
        botsAdded: false,
        timer: null,
        startTime: null
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

    const opponentLoadout = await getLoadoutForPlayer(opponentId, gameId); // Fetch loadout for the player
    console.log("LoadOut:" + opponentLoadout);
    let damageDealt = 20;

    if (opponentLoadout) {
        if (opponentLoadout.prevents_damage) {
            console.log(`Opponent ${opponentId} has a Shield Loadout. Bot does not deal damage.`);
            return { error: 'Opponent cannot take damage due to Shield Loadout' };
        }
        if (opponentLoadout.thief_effect) {
            console.log(`Opponent ${opponentId} has a Thief Loadout. Opponent loses money.`);
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
        checkForWinner(gameId, opponentId);
    }
};

// // Function to handle player joining the game
// const joinGame = async (userId) => {
//     let currentGameId = Object.keys(games).find(gameId => games[gameId].players.length < MAX_PLAYERS);
//     if (!currentGameId) {
//         currentGameId = await createGame();
//     }

//     const user = await Player.findOne({ where: { id: userId } });
//     if (!user) {
//         return { error: 'User not found' };
//     }

//     const playerCount = await MatchStat.count({ where: { game_id: currentGameId } });
//     if (playerCount >= MAX_PLAYERS) {
//         return { error: 'Game is full' };
//     }

//     const existingStat = await MatchStat.findOne({ where: { player_id: userId, game_id: currentGameId } });
//     if (existingStat) {
//         return { error: 'Player is already in the game' };
//     }

//     await MatchStat.create({
//         player_id: userId,
//         game_id: currentGameId,
//         kills: 0,
//         damage_dealt: 0,
//         is_winner: false
//     });

//     games[currentGameId].stats[userId] = { kills: 0, damage_dealt: 0 };
//     games[currentGameId].health[userId] = INITIAL_HEALTH;
//     games[currentGameId].players.push({ id: userId });

//     console.log(`Player ${userId} joined game ${currentGameId}`);
//     return { id: userId, health: INITIAL_HEALTH };
// };


const joinGame = async (userId, gameId) => {
    const game = games[gameId];

    // Check if the game exists and has space for players
    if (!game) {
        return { error: 'Game not found' };
    }
    
    if (game.players.length >= MAX_PLAYERS) {
        return { error: 'Game is full' };
    }

    // Check if the user exists
    const user = await Player.findOne({ where: { id: userId } });
    if (!user) {
        return { error: 'User not found' };
    }

    // Check if the player is already in the game
    const existingStat = await MatchStat.findOne({ where: { player_id: userId, game_id: gameId } });
    if (existingStat) {
        return { error: 'Player is already in the game' };
    }

    // Add player to the game
    await MatchStat.create({
        player_id: userId,
        game_id: gameId,
        kills: 0,
        damage_dealt: 0,
        is_winner: false
    });

    game.stats[userId] = { kills: 0, damage_dealt: 0 };
    game.health[userId] = INITIAL_HEALTH;
    game.players.push({ id: userId });

    console.log(`Player ${userId} joined game ${gameId}`);
    return { id: userId, health: INITIAL_HEALTH };
};



// Function to start the game
const startGame = (gameId) => {
    const game = games[gameId];
    console.log(`Game ${gameId} started with players:`, game.players);
    game.startTime = Date.now();
    game.timer = setTimeout(() => endGame(gameId, null), GAME_DURATION);
};

// // Function to handle player attacks
// const playerAttack = async (gameId, attackerId, targetId) => {
//     const game = games[gameId];

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

//     // Fetch loadout for attacker
//     const attackerLoadout = await getLoadoutForPlayer(attackerId, gameId);
//     console.log("Request : " + attackerId);
    
//     // Loadout Effects
//     let damageDealt = 20; // Base damage
//     if (attackerLoadout) {
//         if (attackerLoadout.prevents_damage) {
//             console.log(`Player ${attackerId} has a Shield Loadout. Opponent does not deal damage.`);
//             return { error: 'Opponent cannot deal damage due to Shield Loadout' };
//         }

//         if (attackerLoadout.thief_effect) {
//             console.log(`Player ${attackerId} has a Thief Loadout. Attacker loses money.`);
//         }

//         if (attackerLoadout.money_multiplier > 1.0) {
//             damageDealt *= attackerLoadout.money_multiplier; // Apply the multiplier
//             console.log(`Player ${attackerId} earns double money. Damage dealt: ${damageDealt}`);
//         }
//     }

//     // Execute attack logic
//     game.health[opponent.id] -= damageDealt;
//     game.stats[attackerId].damage_dealt += damageDealt;

//     console.log(`Player ${attackerId} attacked ${opponent.id}. Opponent health: ${game.health[opponent.id]}`);

//     await MatchStat.increment(
//         { damage_dealt: damageDealt },
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
//         checkForWinner(gameId, opponent.id);
//     }
// };

// const playerAttack = async (gameId, attackerId, targetId) => {
//     const game = games[gameId];

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

//     // Fetch loadout for attacker
//     const attackerLoadout = await getLoadoutForPlayer(attackerId, gameId);
//     console.log("Request : " + attackerId);
    
//     // Loadout Effects
//     let damageDealt = 20; // Base damage
//     if (attackerLoadout) {
//         if (attackerLoadout.prevents_damage) {
//             console.log(`Player ${attackerId} has a Shield Loadout. Opponent does not deal damage.`);
//             return { error: 'Opponent cannot deal damage due to Shield Loadout' };
//         }

//         if (attackerLoadout.thief_effect) {
//             console.log(`Player ${attackerId} has a Thief Loadout. Attacker loses money.`);
//         }

//         if (attackerLoadout.money_multiplier > 1.0) {
//             damageDealt *= attackerLoadout.money_multiplier; // Apply the multiplier
//             console.log(`Player ${attackerId} earns double money. Damage dealt: ${damageDealt}`);
//         }
//     }

//     // Execute attack logic
//     game.health[opponent.id] -= damageDealt;
//     game.stats[attackerId].damage_dealt += damageDealt;

//     console.log(`Player ${attackerId} attacked ${opponent.id}. Opponent health: ${game.health[opponent.id]}`);

//     await MatchStat.increment(
//         { damage_dealt: damageDealt },
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
//         checkForWinner(gameId, opponent.id);
//     }
// };

const playerAttack = async (gameId, attackerId, targetId) => {
    const game = games[gameId];

    if (!game || !game.health[attackerId]) {
        console.log(`Game or player not found: Game ID: ${gameId}, Attacker ID: ${attackerId}`);
        return { error: 'Game or player not found' }; // Return an object with error
    }

    // Check if the opponent exists and has health > 0
    const opponent = game.players.find(player => player.id === targetId && game.health[player.id] > 0);
    
    if (!opponent) {
        console.log(`No opponent found for Target ID: ${targetId} in Game ID: ${gameId}`);
        return { error: 'No opponent found' }; // Return an object with error
    }

    // Fetch loadout for attacker
    const attackerLoadout = await getLoadoutForPlayer(attackerId, gameId);
    console.log("Attacker Loadout for ID " + attackerId + ": ", attackerLoadout);

    // Loadout Effects
    let damageDealt = 20; // Base damage
    if (attackerLoadout) {
        if (attackerLoadout.prevents_damage) {
            console.log(`Player ${attackerId} has a Shield Loadout. Opponent does not deal damage.`);
            return { error: 'Opponent cannot deal damage due to Shield Loadout' };
        }

        if (attackerLoadout.thief_effect) {
            console.log(`Player ${attackerId} has a Thief Loadout. Attacker loses money.`);
        }

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
        checkForWinner(gameId, opponent.id);
    }

    // Return a success result at the end
    return { success: true, damageDealt, opponentId: opponent.id }; // Example success result
};


// Function to respawn a player after elimination
const respawnPlayer = async (gameId, playerId) => {
    const game = games[gameId];
    if (game) {
        game.health[playerId] = INITIAL_HEALTH; // Reset health
        // game.stats[playerId] = {}; // Reset stats

        console.log(`Player ${playerId} respawned in game ${gameId} with ${INITIAL_HEALTH} health`);
        await MatchStat.update(
            { damage_dealt: 0 }, // Reset damage dealt for this respawn
            { where: { player_id: playerId, game_id: gameId } }
        );
    }
};

// Function to check for a winner
const checkForWinner = async (gameId, eliminatedPlayerId) => {
    const game = games[gameId];
    const playersRemaining = game.players.filter(player => game.health[player.id] > 0);

    // If there's only one player left
    if (playersRemaining.length === 1) {
        const winner = playersRemaining[0];
        console.log(`Player ${winner.id} wins game ${gameId} as the last player remaining.`);
        await MatchStat.update({ is_winner: true }, { where: { player_id: winner.id, game_id: gameId } });
        endGame(gameId, winner.id);
    } else {
        // Respawn logic
        setTimeout(() => respawnPlayer(gameId, eliminatedPlayerId), RESPAWN_TIME);
    }
};

// Function to end the game
const endGame = async (gameId, winnerId) => {
    const game = games[gameId];
    if (game.timer) {
        clearTimeout(game.timer);
    }
    
    const statsArray = Object.entries(game.stats);
const maxKillPlayer = statsArray.reduce((maxPlayer, [playerId, stat]) => {
    console.log(`Comparing ${playerId} with ${stat.kills} to ${maxPlayer.id} with ${maxPlayer.kills}`);
    return stat.kills > maxPlayer.kills ? { id: playerId, kills: stat.kills } : maxPlayer;
}, { id: null, kills: 0 }); // Changed initial kills to 0

console.log('Max Kill Player:', maxKillPlayer);


    // If there's a winner based on kills, update is_winner
    if (maxKillPlayer.id) {
        console.log(`Player ${maxKillPlayer.id} wins game ${gameId} with ${maxKillPlayer.kills} kills.`);
        await MatchStat.update({ is_winner: true }, { where: { player_id: maxKillPlayer.id, game_id: gameId } });
    }

    console.log(`Game ${gameId} ended. Winner: ${maxKillPlayer.id}`);
    delete games[gameId]; // Clean up the game
};

// Helper function to get loadout for a player
const getLoadoutForPlayer = async (playerId, gameId) => {
    const loadout = await PlayerGameLoadout.findOne({
        where: { player_id: playerId },
        include: [{ model: Loadout, as: 'loadout' }]
    });

    return loadout ? loadout.loadout : null;
};

module.exports = {
    createGame,
    joinGame,
    playerAttack,
    getLoadoutForPlayer
};

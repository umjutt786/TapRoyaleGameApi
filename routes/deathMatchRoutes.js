const express = require('express');
const router = express.Router();
const gameController = require('../controllers/deathMatchController'); // Adjust the path as necessary

// Route to create a new game
router.post('/death-match/create', async (req, res) => {
    try {
        const gameId = await gameController.createGame();
        res.status(201).json({ gameId });
    } catch (error) {
        console.error("Error creating game:", error);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Route to join a game
// router.post('/death-match/join', async (req, res) => {
//     const { userId } = req.body;
    
//     if (!userId) {
//         return res.status(400).json({ error: 'User ID is required' });
//     }

//     try {
//         const result = await gameController.joinGame(userId);
//         if (result.error) {
//             return res.status(400).json(result);
//         }
//         res.status(200).json(result);
//     } catch (error) {
//         console.error("Error joining game:", error);
//         res.status(500).json({ error: 'Failed to join game' });
//     }
// });

router.post('/death-match/:gameId/join', async (req, res) => {
    const { userId } = req.body;
    const { gameId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const result = await gameController.joinGame(userId, gameId);
        if (result.error) {
            return res.status(400).json(result);
        }
        res.status(200).json(result);
    } catch (error) {
        console.error("Error joining game:", error);
        res.status(500).json({ error: 'Failed to join game' });
    }
});


// Route to handle player attack
// router.post('/death-match/attack', async (req, res) => {
//     const { gameId, attackerId, targetId } = req.body;

//     if (!gameId || !attackerId || !targetId) {
//         return res.status(400).json({ error: 'Game ID, Attacker ID, and Target ID are required' });
//     }

//     try {
//         const result = await gameController.playerAttack(gameId, attackerId, targetId);
//         if (result.error) {
//             return res.status(400).json(result);
//         }
//         res.status(200).json(result);
//     } catch (error) {
//         console.error("Error handling attack:", error);
//         res.status(500).json({ error: 'Failed to handle attack' });
//     }
// });


// router.post('/death-match/:gameId/attack', async (req, res) => {
//     const { attackerId, targetId } = req.body;
//     const { gameId } = req.params;  // gameId is now passed as a route parameter

//     if (!gameId || !attackerId || !targetId) {
//         return res.status(400).json({ error: 'Game ID, Attacker ID, and Target ID are required' });
//     }

//     try {
//         const result = await gameController.playerAttack(gameId, attackerId, targetId);
//         if (result.error) {
//             return res.status(400).json(result);
//         }
//         res.status(200).json(result);
//     } catch (error) {
//         console.error("Error handling attack:", error);
//         res.status(500).json({ error: 'Failed to handle attack' });
//     }
// });

router.post('/death-match/:gameId/attack', async (req, res) => {
    const { attackerId, targetId } = req.body;
    const { gameId } = req.params;

    if (!gameId || !attackerId || !targetId) {
        return res.status(400).json({ error: 'Game ID, Attacker ID, and Target ID are required' });
    }

    try {
        const result = await gameController.playerAttack(gameId, attackerId, targetId);
        
        // Ensure result is an object before checking for error
        if (typeof result !== 'object' || result.error) {
            return res.status(400).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error("Error handling attack:", error);
        res.status(500).json({ error: 'Failed to handle attack' });
    }
});



// Route to respawn a player
router.post('/death-match/respawn', async (req, res) => {
    const { gameId, playerId } = req.body;

    if (!gameId || !playerId) {
        return res.status(400).json({ error: 'Game ID and Player ID are required' });
    }

    try {
        await gameController.respawnPlayer(gameId, playerId);
        res.status(200).json({ message: 'Player respawned successfully' });
    } catch (error) {
        console.error("Error respawning player:", error);
        res.status(500).json({ error: 'Failed to respawn player' });
    }
});

// Route to end the game
router.post('/death-match/end', async (req, res) => {
    const { gameId } = req.body;

    if (!gameId) {
        return res.status(400).json({ error: 'Game ID is required' });
    }

    try {
        await gameController.endGame(gameId);
        res.status(200).json({ message: 'Game ended successfully' });
    } catch (error) {
        console.error("Error ending game:", error);
        res.status(500).json({ error: 'Failed to end game' });
    }
});

module.exports = router;

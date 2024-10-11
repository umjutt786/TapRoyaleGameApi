const express = require('express');
const GameController = require('../controllers/GameController');

const router = express.Router();

router.post('/create', async (req, res) => {
    const gameId = await GameController.createGame();
    res.json({ gameId });
});

router.post('/:gameId/join', async (req, res) => {
    const { userId } = req.body;
    const player = await GameController.joinGame(userId);
    res.json(player);
});

router.post('/:gameId/attack', async (req, res) => {
    const { attackerId, targetId } = req.body;

    // Check if both attackerId and targetId are provided
    if (!attackerId || !targetId) {
        return res.status(400).json({ error: 'attackerId and targetId are required.' });
    }

    try {
        // Await the playerAttack function to get the result
        const result = await GameController.playerAttack(req.params.gameId, attackerId, targetId);
        
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        // Respond with the result
        res.json(result);
    } catch (error) {
        console.error('Error handling player attack:', error);
        res.status(500).json({ error: 'An error occurred while processing the attack.' });
    }
});


router.post('/:gameId/end', async (req, res) => {
    const { winnerId } = req.body;
    await GameController.endGame(req.params.gameId, winnerId);
    res.sendStatus(200);
});

module.exports = router;

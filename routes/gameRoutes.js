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

router.post('/:gameId/attack', (req, res) => {
    const { playerId } = req.body;
    const result = GameController.playerAttack(req.params.gameId, playerId);
    res.json(result);
});

router.post('/:gameId/end', async (req, res) => {
    const { winnerId } = req.body;
    await GameController.endGame(req.params.gameId, winnerId);
    res.sendStatus(200);
});

module.exports = router;

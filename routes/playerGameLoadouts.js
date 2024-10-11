// routes/playerGameLoadouts.js
const express = require('express');
const { assignLoadoutToPlayer } = require('../controllers/loadoutController');
const router = express.Router();

// Assign loadout to player for a game
router.post('/:gameId/loadout', assignLoadoutToPlayer);

module.exports = router;

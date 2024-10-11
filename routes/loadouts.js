// routes/loadouts.js
const express = require('express');
const { getAllLoadouts } = require('../controllers/loadoutController');
const router = express.Router();

// Get all available loadouts
router.get('/', getAllLoadouts);

module.exports = router;

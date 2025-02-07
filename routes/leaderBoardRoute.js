const express = require('express')
const router = express.Router()
const { getAllUsers } = require('../controllers/leaderBoardController')

router.get('/', getAllUsers)

module.exports = router

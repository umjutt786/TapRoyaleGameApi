// routes/countryRoutes.js
const express = require('express')
const router = express.Router()
const CountryController = require('../controllers/countryController')

// Route to get all countries
router.get('/', CountryController.getAllCountries)

module.exports = router

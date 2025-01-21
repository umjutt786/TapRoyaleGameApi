// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  fetchUserProfile,
} = require('../controllers/authController') // Import controllers
const { authenticate } = require('../middlewares/authMiddleware') // Import middleware

// Registration route
router.post('/register', register)

// Login route
router.post('/login', login)

// Example protected route
router.post('/profile', fetchUserProfile)

module.exports = router;

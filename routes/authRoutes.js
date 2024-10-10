// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController'); // Import controllers
const { authenticate } = require('../middlewares/authMiddleware'); // Import middleware

// Registration route
router.post('/register', register);

// Login route
router.post('/login', login);

// Example protected route
router.get('/profile', authenticate, (req, res) => {
    res.json({ message: 'Access granted to profile', userId: req.user.userId });
});

module.exports = router;

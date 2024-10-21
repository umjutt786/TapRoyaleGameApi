const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Country = require('../models/Country');

exports.register = async (req, res) => {
    const { username, country_id } = req.body;
    console.log('Request Body:', req.body);
    console.log(username);
    try {
        const country = await Country.findOne({ where: { id: country_id } });
        if (!country) {
            return res.sendResponse(null, 'Invalid country ID', 400);
        }
        let user = await User.findOne({ where: { username } });
        if (user) return res.status(400).json({ message: 'Username already exists' });

        user = await User.create({ username, country_id });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.sendResponse({ token: token, user:user }, 'User registered successfully');
    } catch (error) {
        console.error('Error during login:', error);
        res.sendError('Error creating user', 500);
    }
};

exports.login = async (req, res) => {
    const { username } = req.body;

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) return res.sendResponse(null, 'Invalid username', 400);;

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.sendResponse({ token: token,user:user  }, 'Login successful');
    } catch (error) {
        res.sendError('Login failed', 401);
    }
};

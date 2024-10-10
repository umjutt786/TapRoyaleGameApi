// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
    const token = req.header('Authorization'); // Get token from request header

    if (!token) return res.status(403).json({ message: 'Access denied' });

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info to request object
        next(); // Proceed to next middleware/route
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

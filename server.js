// server.js
const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const countryRoutes = require('./routes/countryRoutes'); // Import country routes
const responseFormatter = require('./middlewares/responseFormatter'); // Import response formatter


dotenv.config();

const app = express();

app.use(express.json()); // Parse JSON bodies
app.use(responseFormatter); // Parse JSON bodies
app.use('/api/auth', authRoutes); // Use auth routes
app.use('/api/countries', countryRoutes); // Use country routes

// Sync database
sequelize.sync()
    .then(() => {
        console.log('Database synced successfully.');
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

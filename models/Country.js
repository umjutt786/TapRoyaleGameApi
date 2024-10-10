// models/Country.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path as necessary

const Country = sequelize.define('Country', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING(3), // ISO 3166-1 alpha-3 code
        allowNull: false,
        unique: true, // Ensures country codes are unique
    },
}, {
    timestamps: false, // This will add createdAt and updatedAt timestamps
    tableName: 'countries', // This specifies the table name in the database
});

module.exports = Country;

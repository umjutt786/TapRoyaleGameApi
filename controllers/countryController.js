const Country = require('../models/Country');

exports.getAllCountries = async (req, res) => {
    try {
        const countries = await Country.findAll();
        res.sendResponse(countries);
    } catch (error) {
        console.error(error);
        res.sendError('Internal Server Error'); // Use the generic error method
    }
};

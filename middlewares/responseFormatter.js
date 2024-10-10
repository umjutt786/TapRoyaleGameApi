// middleware/responseFormatter.js
const responseFormatter = (req, res, next) => {
    res.sendResponse = (data, message = 'Success', status = 200) => {
        res.status(status).json({
            status,
            message,
            data,
        });
    };

    res.sendError = (message = 'Error', status = 500) => {
        res.status(status).json({
            status,
            message,
            data: null,
        });
    };

    next();
};

module.exports = responseFormatter;

let ioInstance;

const setIo = (io) => {
    ioInstance = io;
};

const getIo = () => {
    return ioInstance;
};

module.exports = {
    setIo,
    getIo
};
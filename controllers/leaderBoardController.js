const User = require('../models/User')

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['total_kills', 'DESC']],
    })
    res.sendResponse(users, 'Users fetched successfully', 200)
  } catch (error) {
    res.sendError('Error fetching users', 500)
  }
}

module.exports = {
  getAllUsers,
}

const botUsernames = require('./botUsernames')

const usedUsernamesByGame = new Map()

function getUniqueUsername(gameId) {
  if (!gameId) {
    console.warn('No gameId provided. Returning random username.')
  }

  if (typeof gameId !== 'string') {
   gameId = String(gameId)    
  }

  if (!usedUsernamesByGame.has(gameId)) {
    usedUsernamesByGame.set(gameId, new Set())
  }

  const usedUsernames = usedUsernamesByGame.get(gameId)
  const availableUsernames = botUsernames.filter(
    (username) => !usedUsernames.has(username)
  )

  if (availableUsernames.length === 0) {
    console.warn(
      `All usernames used for game ${gameId}. Resetting used usernames.`
    )
    usedUsernames.clear()
    availableUsernames.push(...botUsernames)
  }

  const randomIndex = Math.floor(Math.random() * availableUsernames.length)
  const selectedUsername = availableUsernames[randomIndex]
  usedUsernames.add(selectedUsername)
  return selectedUsername
}

function deleteUsedUsernamesByGame(gameId) {
  usedUsernamesByGame.delete(gameId)
}


module.exports = {
  getUniqueUsername,
  deleteUsedUsernamesByGame,
}

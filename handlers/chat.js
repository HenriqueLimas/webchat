const chatModel = require('../models/chats.js')

const streamByUser = {}

module.exports = {
  connection,
  addUser,
  addMessage
}

function connection(stream) {
  return function (username) {
    chatModel
      .getUser(username)
      .catch(function () {
        return chatModel.addUser(username)
      })
      .then(function () {
        streamByUser[username] = stream
        stream.write('connected!' + username + '\n')
      })
  }
}

function addUser() {
  return function (username, chat_id) {
    chatModel.addUserIntoChat(chat_id, username)
  }
}

function addMessage() {
  return function (username, chat_id, message) {
    chatModel.getAllUsersIntoChat(chat_id)
      .then(function (users) {
        users
          .map(user => ({
            name: user,
            stream: streamByUser[user]
          }))
          .filter(user => user.stream)
          .forEach(user => {
            user.stream.write('chat_id!' + chat_id + '!<' + username + '> ' + message + '\n')
          })
      })
  }
}

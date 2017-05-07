const level = require('level')
const onend = require('end-of-stream')
const through = require('through2')
const to = require('to2')
const crypto = require('crypto')

const db = level('chats.db')

module.exports = {
  getAllChatsByUsername,
  createChat,
  addUserIntoChat,
  getAllUsersIntoChat,
  getUser,
  addUser
}

function getAllChatsByUsername (username) {
  return new Promise(function (resolve, reject) {
    const chats = []
    const stream = db.createReadStream({
      gt: 'user!' + username + '!chat!',
      lt: 'user!' + username + '!chat!~'
    }).pipe(to.obj(function (row, enc, next) {
      const chat_id = row.key.split('!')[3]
      const chat = {
        id: chat_id,
        messages: []
      }

      const messagesStream = db.createReadStream({
        gt: 'user!' + username + '!chat!' + chat_id + '!messages!',
        lt: 'user!' + username + '!chat!' + chat_id + '!messages!~'
      }).pipe(to.obj(function (row, enc, next) {
        chat.messages.push(row.value)
        next()
      }))

      onend(messagesStream, function () {
        chats.push(chat)
        next()
      })
    }))

    stream.on('error', reject)

    onend(stream, function () {
      resolve(chats)
    })
  })
}

function getAllUsersIntoChat (chat_id) {
  return new Promise(function (resolve) {
    const users = []

    onend(db.createReadStream({
      gt: 'chat!' + chat_id + '!user!',
      lt: 'chat!' + chat_id + '!user!~'
    }).pipe(to.obj(function (row, enc, next) {
      var username = row.key.split('!')[3]
      users.push(username)

      next()
    })), function (error) {
      if (error) return reject(error)
      resolve(users)
    })
  })
}

function createChat(username) {
  const chat_id = crypto.randomBytes(16).toString('hex')
  return addUserIntoChat(chat_id, username)
}

function addUserIntoChat(chat_id, username) {
  return new Promise(function (resolve, reject) {
    const batch = [
      { key: 'user!' + username + '!chat!' + chat_id, value: chat_id },
      { key: 'chat!' + chat_id + '!user!' + username, value: chat_id }
    ]

    db.batch(batch, function (error) {
      if (error) return reject(error)

      const chat = {
        id: chat_id,
        messages: ['Welcome to the new chat ' + username]
      }

      resolve(chat)
    })
  })
}

function getUser (username) {
  return new Promise(function (resolve, reject) {
    db.get('user!' + username, function (error, value) {
      if (error || !value) {
        reject(error)
      } else {
        resolve(value)
      }
    })
  })
}

function addUser (username) {
  return new Promise(function (resolve, reject) {
    db.put('user!' + username, username, function (error) {
      if (error) return reject(error)

      resolve(username)
    })
  })
}

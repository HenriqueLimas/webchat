var http = require('http')
var websock = require('websocket-stream')
var onend = require('end-of-stream')
var through = require('through2')

var chatModel = require('./models/chats.js')

var server = http.createServer(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9966')

  if (/GET/i.test(req.method) && /chats/.test(req.url)) {
    var username = require('url').parse(req.url).query.split('=')[1]

    chatModel.getAllChatsByUsername(username)
      .then(function (chats) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(chats))
      })
  } else if (/POST/i.test(req.method) && /chats/.test(req.url)) {
    var username = require('url').parse(req.url).query.split('=')[1]

    chatModel.createChat(username)
      .then(function (chat) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(chat))
      })
  }
})

var count = 0
var streamByUser = {}

var ws = websock.createServer({ server: server }, function (stream) {
  stream.pipe(handleChat(stream))

  onend(stream, function () {
    console.log('DISCONNECTED')
  })
})

function handleChat (stream) {
  return through(function (buff, enc, next) {
    // type!username!chat_id!message
    var data = buff.toString().split('!')
    var typeOfMessage = data[0]
    var username = data[1]
    var chat_id = data[2]
    var message = data[3]

    var runMessage = {
      connection: function connection(username) {
        chatModel
          .getUser(username)
          .catch(function () {
            return chatModel.addUser(username)
          })
          .then(function () {
            streamByUser[username] = stream
            stream.write('connected!' + username + '\n')
          })
      },
      add_user: function add_user(username, chat_id) {
        chatModel.addUserIntoChat(chat_id, username)
      },
      add_message: function add_message(username, chat_id, message) {
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

    runMessage[typeOfMessage](username, chat_id, message)
    next()
  })
}

server.listen(5000)

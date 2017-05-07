var http = require('http')
var websock = require('websocket-stream')
var onend = require('end-of-stream')
var through = require('through2')

var chatModel = require('./models/chats.js')
var chatHandler = require('./handlers/chat.js')

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
      connection: chatHandler.connection(stream),
      add_user: chatHandler.addUser(),
      add_message: chatHandler.addMessage()
    }

    runMessage[typeOfMessage](username, chat_id, message)
    next()
  })
}

server.listen(5000)

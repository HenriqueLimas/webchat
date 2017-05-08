const http = require('http')
const websock = require('websocket-stream')
const onend = require('end-of-stream')
const through = require('through2')

const chatModel = require('./models/chats.js')
const chatHandler = require('./handlers/chat.js')

const url = require('url')
const querystring = require('querystring')

const server = http.createServer(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9966')

  if (/GET/i.test(req.method) && /chats/.test(req.url)) {
    const username = query(req).user

    chatModel.getAllChatsByUsername(username)
      .then(function (chats) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(chats))
      })
  } else if (/POST/i.test(req.method) && /chats/.test(req.url)) {
    const username = query(req).user

    chatModel.createChat(username)
      .then(function (chat) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(chat))
      })
  }
})

function query(req) {
  return querystring.parse(url.parse(req.url).query)
}

const ws = websock.createServer({ server: server }, function (stream) {
  stream.pipe(handleChat(stream))

  onend(stream, function () {
    console.log('DISCONNECTED')
  })
})

function handleChat (stream) {
  return through(function (buff, enc, next) {
    // type!username!chat_id!message
    const data = buff.toString().split('!')
    const typeOfMessage = data[0]
    const username = data[1]
    const chat_id = data[2]
    const message = data[3]

    const runMessage = {
      connection: chatHandler.connection(stream),
      add_user: chatHandler.addUser(),
      add_message: chatHandler.addMessage()
    }

    runMessage[typeOfMessage](username, chat_id, message)
    next()
  })
}

server.listen(5000)

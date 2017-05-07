var html = require('yo-yo')
var through = require('through2')
var ws = require('websocket-stream')('ws://localhost:5000' )

var root = document.body.appendChild(document.createElement('div'))
var state = {
  username: 'hey_joe',
  rooms: []
}

update(state)

ws.pipe(through(function (buff, enc, next) {
  var msg = buff.toString()
  if (/create_chat/.test(msg)) {
    var room = JSON.parse(msg.split('!')[1])
    state.rooms.push(room)
  } else {
    var data = msg.split('!')
    var chat_id = data[1]
    var message = data[2]

    var room = state.rooms.find(function (room) {
      return room.id === chat_id
    })

    if (room) room.messages.push(message)
  }

  update(state)
  next()
}))

ws.write('connection!' + state.username)

fetch('http://localhost:5000/chats?user=' + state.username)
  .then(function (res) {
    return res.json()
  })
  .then(function updateRooms (rooms) {
    state.rooms = rooms || []

    update(state)
  })

function update(state) {
  html.update(root, html`<div>
    <h1>Chat rooms</h1>
    <h2>Current user ${state.username}</h2>

    <form onsubmit=${handleChangeUser}>
      <h3>Change user</h3>
      <input name="username" >
    </form>

    <button onclick=${handleCreateChat}>Create chat</button>

    ${state.rooms.map((room) => html`
      <div>
        <h3>Chat - ${room.id}</h3>

        <form onsubmit=${handleAddUser} data-chat=${room.id}>
          <h4>Add user to the chat</h4>
          <input name="username" />
        </form>

        <pre>${room.messages.join('\n')}</pre>

        <form onsubmit=${handleSendMessage} data-chat=${room.id}>
          <input name="message">
        </form>
      </div>
    `)}

   </div>`)

  function handleChangeUser (evt) {
    evt.preventDefault()
    var username = this.elements.username.value

    state.username = username
    update(state)
    this.reset()
  }

  function handleAddUser (evt) {
    evt.preventDefault()
    var username = this.elements.username.value
    var chat_id = this.getAttribute('data-chat')

    if (!username) return

    ws.write('add_user!' + username + '!' + chat_id)
    this.reset()
  }

  function handleCreateChat (evt) {
    fetch('http://localhost:5000/chats?user=' + state.username, { method: 'POST' })
  }

  function handleSendMessage (evt) {
    evt.preventDefault()
    var username = state.username
    var chat_id = this.getAttribute('data-chat')
    var message = this.elements.message.value

    if (!message) return

    ws.write('add_message!' + username + '!' + chat_id + '!' + message)
    this.reset()
  }
}

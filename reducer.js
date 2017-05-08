module.exports = function (bus, state) {
  bus.on('add-chat-room', function addChatRoom (room) {
    state.rooms.push(room)

    bus.emit('update')
  })

  bus.on('add-message-into-chat', function addMessageIntoChat (chat_id, message) {
    var room = state.rooms.filter(function (room) {
      return room.id === chat_id
    })[0]

    if (room) room.messages.push(message)

    bus.emit('update')
  })

  bus.on('fetch-chat-rooms', function fetchChatRooms () {
    fetch('http://localhost:5000/chats?user=' + state.username)
      .then(function (res) {
        return res.json()
      })
      .then(function updateRooms (rooms) {
        state.rooms = rooms || []

        bus.emit('update')
      })
  })

  bus.on('change-user', function changeUser (username) {
    state.username = username
    bus.emit('update')
  })
}

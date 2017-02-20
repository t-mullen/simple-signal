var io = require('socket.io')()
var signal = new require('./../src/simple-signal-server.js')(io)

var PORT = 9080

signal.on('request', function (request) {
  if (request.metadata.redirect) {
    request.forward(request.metadata.redirect)
  } else {
    request.forward()
  }
})

io.on('connection', function (socket) {
  socket.on('close', function () {
    socket.disconnect()
  })
})

console.log('test server running on port '+PORT)
io.listen(PORT)
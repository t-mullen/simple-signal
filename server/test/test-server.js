var io = require('socket.io')()
var SimpleSignalServer = require('./../src/simple-signal-server.js')
var signal = new SimpleSignalServer(io)

var PORT = 3000

signal.on('request', function (request) {
  if (request.metadata.redirect) {
    request.forward(request.metadata.redirect)
  } else {
    request.forward()
  }
})

signal.on('discover', function (request) {
  request.discover('discovery metadata')
})

io.on('connection', function (socket) {
  socket.on('close', function () {
    socket.disconnect()
  })
})

console.log('test server running on port ' + PORT)
io.listen(PORT)

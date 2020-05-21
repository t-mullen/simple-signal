var io = require('socket.io')()
var SimpleSignalServer = require('./../../server/src/index')
var signal = new SimpleSignalServer(io)

var PORT = 3000

signal.on('request', function (request) {
  request.forward()
})

signal.on('discover', function (request) {
  if (request.discoveryData === null) {
    request.discover(null)
  } else {
    request.discover('discovery metadata')
  }
})

console.log('test server running on port ' + PORT)
io.listen(PORT)

var io = require('socket.io')()
var SimpleSignalServer = require('./../../server/src/index')
var signal = new SimpleSignalServer(io)

var PORT = 3000

signal.on('request', function (request) {
  if (request.metadata && request.metadata.redirect) {
    request.forward(request.metadata.redirect)
  } else {
    request.forward()
  }
})

signal.on('discover', function (request) {
  if (request.discoveryData === null) {
    request.discover('abc' + Math.random(), null)
  } else {
    request.discover('abc' + Math.random(), 'discovery metadata')
  }
})

console.log('test server running on port ' + PORT)
io.listen(PORT)

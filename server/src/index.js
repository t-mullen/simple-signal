module.exports = SimpleSignalServer

var inherits = require('inherits')
var EventEmitter = require('nanobus')

inherits(SimpleSignalServer, EventEmitter)

function SimpleSignalServer (io) {
  if (!(this instanceof SimpleSignalServer)) return new SimpleSignalServer(io)

  EventEmitter.call(this)

  this._sockets = {}

  io.on('connection', (socket) => {
    socket.on('simple-signal[discover]', this._onDiscover.bind(this, socket))
  })
}

SimpleSignalServer.prototype._onDiscover = function (socket, discoveryData) {
  const discoveryRequest = { socket, discoveryData }
  discoveryRequest.discover = (id=socket.id, discoveryData={}) => {
    this._sockets[id] = socket
    socket.clientId = id

    socket.on('disconnect', () => {
      this.emit('disconnect', socket)
    })

    socket.emit('simple-signal[discover]', { id, discoveryData })

    socket.on('simple-signal[offer]', this._onOffer.bind(this, socket))
    socket.on('simple-signal[signal]', this._onSignal.bind(this, socket))
  }

  if (this.listeners('discover').length === 0) {
    discoveryRequest.discover() // defaults to using socket.id for identification
  } else {
    this.emit('discover', discoveryRequest)
  }
}

SimpleSignalServer.prototype._onOffer = function (socket, { sessionId, signal, target, metadata }) {
  const request = { initiator: socket.clientId, target, metadata, socket } 
  request.forward = (target=request.target, metadata=request.metadata) => {
    if (!this._sockets[target]) return
    this._sockets[target].emit('simple-signal[offer]', {
      initiator: socket.clientId, sessionId, signal, metadata
    })
  }

  if (this.listeners('request').length === 0) {
    request.forward()
  } else {
    this.emit('request', request)
  }
}

SimpleSignalServer.prototype._onSignal = function (socket, { target, sessionId, signal, metadata }) {
  if (!this._sockets[target]) return

  // misc. signaling data is always forwarded
  this._sockets[target].emit('simple-signal[signal]', {
    sessionId, signal, metadata
  })
}

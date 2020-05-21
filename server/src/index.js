module.exports = SimpleSignalServer

var inherits = require('inherits')
var EventEmitter = require('nanobus')

inherits(SimpleSignalServer, EventEmitter)

function SimpleSignalServer(io) {
  if (!(this instanceof SimpleSignalServer)) return new SimpleSignalServer(io)

  EventEmitter.call(this)

  io.on('connection', (socket) => {
    socket.on('simple-signal[discover]', this._onDiscover.bind(this, socket))
    socket.on('disconnect', this._onDisconnect.bind(this, socket));
  })
}

SimpleSignalServer.prototype._onDiscover = function (socket, discoveryData) {
  const discoveryRequest = { socket, discoveryData }
  discoveryRequest.discover = (discoveryData = {}) => {
    socket.removeAllListeners('simple-signal[offer]');
    socket.removeAllListeners('simple-signal[signal]');
    socket.removeAllListeners('simple-signal[reject]');

    socket.emit('simple-signal[discover]', { id: socket.id, discoveryData })

    socket.on('simple-signal[offer]', this._onOffer.bind(this, socket))
    socket.on('simple-signal[signal]', this._onSignal.bind(this, socket))
    socket.on('simple-signal[reject]', this._onReject.bind(this, socket))
  }

  if (this.listeners('discover').length === 0) {
    discoveryRequest.discover() // defaults to using socket.id for identification
  } else {
    this.emit('discover', discoveryRequest)
  }
}

SimpleSignalServer.prototype._onOffer = function (socket, { sessionId, signal, target, metadata }) {
  const request = { initiator: socket.id, target, metadata, socket }
  request.forward = (metadata = request.metadata) => {
    socket.broadcast.to(target).emit('simple-signal[offer]', {
      initiator: socket.id, sessionId, signal, metadata
    })
  }

  if (this.listeners('request').length === 0) {
    request.forward()
  } else {
    this.emit('request', request)
  }
}

SimpleSignalServer.prototype._onSignal = function (socket, { target, sessionId, signal, metadata }) {
  // misc. signaling data is always forwarded
  socket.broadcast.to(target).emit('simple-signal[signal]', {
    sessionId, signal, metadata
  })
}

SimpleSignalServer.prototype._onReject = function (socket, { target, sessionId, metadata }) {
  // rejections are always forwarded
  socket.broadcast.to(target).emit('simple-signal[reject]', {
    sessionId, metadata
  })
}

SimpleSignalServer.prototype._onDisconnect = function (socket) {
  this.emit('disconnect', socket)
}

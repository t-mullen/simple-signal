module.exports = SimpleSignalClient

var SimplePeer = require('simple-peer')
var cuid = require('cuid')
var inherits = require('inherits')
var EventEmitter = require('nanobus')

inherits(SimpleSignalClient, EventEmitter)

function SimpleSignalClient (socket, metadata) {
  var self = this
  if (!(self instanceof SimpleSignalClient)) return new SimpleSignalClient(socket, metadata)

  EventEmitter.call(this)

  metadata = metadata || {}

  self._peers = {}
  self._requests = {}
  self.id = null
  self.socket = socket

  // Discover own socket.id
  socket.on('connect', function () {
    socket.emit('simple-signal[discover]', metadata)
  })
  if (socket.connected) {
    socket.emit('simple-signal[discover]', metadata)
  }

  self.socket.on('simple-signal[discover]', self._onDiscover.bind(self))
  self.socket.on('simple-signal[offer]', self._onOffer.bind(self))
  self.socket.on('simple-signal[answer]', self._onAnswer.bind(self))
}

SimpleSignalClient.prototype._onDiscover = function (data) {
  var self = this

  self.id = data.id
  self.emit('ready', data.metadata)
}

SimpleSignalClient.prototype._onOffer = function (data) {
  var self = this

  if (self._requests[data.trackingNumber]) {
    if (self._peers[data.trackingNumber]) {
      self._peers[data.trackingNumber].signal(data.signal)
    } else {
      self._requests[data.trackingNumber].push(data.signal)
    }
    return
  }

  self._requests[data.trackingNumber] = [data.signal]

  self.emit('request', {
    id: data.id,
    metadata: data.metadata || {},
    accept: function (opts, metadata) {
      opts = opts || {}
      metadata = metadata || {}
      opts.initiator = false
      var peer = new SimplePeer(opts)

      peer.id = data.id
      peer.metadata = data.metadata || {}
      self._peers[data.trackingNumber] = peer
      self.emit('peer', peer)

      peer.on('signal', function (signal) {
        self.socket.emit('simple-signal[answer]', {
          signal: signal,
          trackingNumber: data.trackingNumber,
          target: data.id,
          metadata: metadata
        })
      })

      self._requests[data.trackingNumber].forEach(function (request) {
        peer.signal(request)
      })
      self._requests[data.trackingNumber] = []
    }
  })
}

SimpleSignalClient.prototype._onAnswer = function (data) {
  var self = this

  var peer = self._peers[data.trackingNumber]
  if (!peer) return

  if (peer.id) {
    peer.id = data.id
  } else {
    peer.id = data.id
    peer.metadata = data.metadata
    self.emit('peer', peer)
  }

  peer.signal(data.signal)
}

SimpleSignalClient.prototype.connect = function (id, opts, metadata) {
  var self = this

  opts = opts || {}
  metadata = metadata || {}

  opts.initiator = true
  var trackingNumber = cuid()

  var peer = new SimplePeer(opts)
  self._peers[trackingNumber] = peer

  peer.on('signal', function (signal) {
    self.socket.emit('simple-signal[offer]', {
      signal: signal,
      trackingNumber: trackingNumber,
      target: id,
      metadata: metadata
    })
  })
}

SimpleSignalClient.prototype.rediscover = function (metadata) {
  var self = this
  metadata = metadata || {}
  self.socket.emit('simple-signal[discover]', metadata)
}

SimpleSignalClient.SimplePeer = SimplePeer

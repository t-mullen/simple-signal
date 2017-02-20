module.exports = SimpleSignalClient

var SimplePeer = require('simple-peer')

function SimpleSignalClient (socket) {
  var self = this

  self._handlers = {}
  self._peers = {}
  self._requests = {}
  self.id = null
  self.socket = socket

  // Discover own socket.id
  socket.on('connect', function () {
    socket.emit('simple-signal[discover]')
  })
  if (socket.connected) {
    socket.emit('simple-signal[discover]')
  }

  socket.on('simple-signal[discover]', function (data) {
    self.id = data.id
    self._emit('ready', data.metadata)
  })

  // Respond to offers
  socket.on('simple-signal[offer]', function (data) {
    if (self._requests[data.trackingNumber]) {
      self._peers[data.trackingNumber].signal(data.signal)
      return
    } else {
      self._requests[data.trackingNumber] = true
    }

    self._emit('request', {
      id: data.id,
      metadata: data.metadata,
      accept: function (opts) {
        opts = opts || {}
        opts.initiator = false
        var peer = new SimplePeer(opts)

        peer.id = data.id
        self._peers[data.trackingNumber] = peer
        self._emit('peer', peer)

        peer.on('signal', function (signal) {
          socket.emit('simple-signal[answer]', {
            signal: signal,
            trackingNumber: data.trackingNumber,
            target: data.id
          })
        })

        peer.signal(data.signal)
      }
    })
  })

  // Respond to answers
  socket.on('simple-signal[answer]', function (data) {
    var peer = self._peers[data.trackingNumber]
    if (peer) {
      if (peer.id) {
        peer.id = data.id
      } else {
        peer.id = data.id
        self._emit('peer', peer)
      }

      peer.signal(data.signal)
    }
  })
}

SimpleSignalClient.prototype._emit = function (event, data) {
  var self = this
  var fns = self._handlers[event] || []
  var fn
  var i

  for (i = 0; i < fns.length; i++) {
    fn = fns[i]
    if (fn && typeof (fn) === 'function') {
      fn(data)
    }
  }
}

SimpleSignalClient.prototype.on = function (event, handler) {
  var self = this
  if (!self._handlers[event]) {
    self._handlers[event] = []
  }
  self._handlers[event].push(handler)
}

SimpleSignalClient.prototype.connect = function (id, opts, metadata) {
  var self = this
  opts = opts || {}
  metadata = metadata || {}
  opts.initiator = true
  var trackingNumber = Math.random().toString(36)

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

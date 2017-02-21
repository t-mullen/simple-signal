module.exports = SimpleSignalClient

var SimplePeer = require('simple-peer')
var cuid = require('cuid')

function SimpleSignalClient (socket, metadata) {
  var self = this

  self._handlers = {}
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
      accept: function (opts, metadata) {
        opts.initiator = false
        var peer = new SimplePeer(opts)

        peer.id = data.id
        peer.metadata = data.metadata
        self._peers[data.trackingNumber] = peer
        self._emit('peer', peer)

        peer.on('signal', function (signal) {
          socket.emit('simple-signal[answer]', {
            signal: signal,
            trackingNumber: data.trackingNumber,
            target: data.id,
            metadata: metadata
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
        peer.metadata = data.metadata
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

  if (handler) {
    self._handlers[event].push(handler)
  } else {
    return new Promise(function (resolve, reject) {
      self._handlers[event].push(resolve)
    })
  }
}

SimpleSignalClient.prototype.connect = function (id, opts, metadata) {
  var self = this

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
  self.socket.emit('simple-signal[discover]', metadata)
}

SimpleSignalClient.SimplePeer = SimplePeer

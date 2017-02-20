module.exports = function (io) {
  return new SimpleSignalServer(io)
}

function SimpleSignalServer (io) {
  var self = this
  self._handlers = {}
  self._sockets = {}
  self.peers = []

  io.on('connection', function (socket) {
    self._sockets[socket.id] = socket

    socket.on('simple-signal[discover]', function (metadata) {
      socket.emit('simple-signal[discover]', {
        id: socket.id,
        metadata: (self._handlers['discover'] && self._handlers['discover'][0](socket.id, metadata)) || {}
      })
      self.peers.push(socket.id)
    })

    socket.on('simple-signal[offer]', function (data) {
      if (!self._handlers['request']) {
        // Automatically forward if no handlers
        if (!self._sockets[data.target]) return
        self._sockets[data.target].emit('simple-signal[offer]', {
          id: socket.id,
          trackingNumber: data.trackingNumber,
          signal: data.signal
        })
      }

      self._emit('request', {
        initiator: {
          id: socket.id
        },
        receiver: {
          id: data.target
        },
        metadata: data.metadata || {},
        forward: function (id, metadata) {
          id = id || data.target
          self._sockets[id].emit('simple-signal[offer]', {
            id: socket.id,
            trackingNumber: data.trackingNumber,
            signal: data.signal,
            metadata: metadata || data.metadata || {}
          })
        }
      })
    })

    socket.on('simple-signal[answer]', function (data) {
      // Answers are not intercepted by server
      self._sockets[data.target].emit('simple-signal[answer]', {
        id: socket.id,
        trackingNumber: data.trackingNumber,
        signal: data.signal,
        metadata: data.metadata || {}
      })
    })
  })
}

SimpleSignalServer.prototype._emit = function (event, data) {
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

SimpleSignalServer.prototype.on = function (event, handler) {
  var self = this
  if (!self._handlers[event]) {
    self._handlers[event] = []
  }
  self._handlers[event].push(handler)
}

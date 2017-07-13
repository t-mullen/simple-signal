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

    socket.on('disconnect', function () {
      delete self._sockets[socket.id]
      self._emit('disconnect', socket.id)
    })

    socket.on('simple-signal[discover]', function (metadata) {
      if (!self._handlers['discover']) {
        socket.emit('simple-signal[discover]', {
          id: socket.id
        })
        return
      }

      self._emit('discover', {
        initiator: { // Duplicate to match request.initiator.id
          id: socket.id
        },
        id: socket.id,
        metadata: metadata,
        discover: function (metadata) {
          socket.emit('simple-signal[discover]', {
            id: socket.id,
            metadata: metadata
          })
        }
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
          signal: data.signal,
          metadata: data.metadata || {}
        })
        return
      }

      self._emit('request', {
        initiator: {
          id: socket.id
        },
        receiver: {
          id: data.target
        },
        metadata: data.metadata || {},
        forward: function (target, metadata) {
          target = target || data.target || {}
          metadata = metadata || data.metadata || {}
          if (!self._sockets[target]) return
          self._sockets[target].emit('simple-signal[offer]', {
            id: socket.id,
            trackingNumber: data.trackingNumber,
            signal: data.signal,
            metadata: metadata
          })
        }
      })
    })

    socket.on('simple-signal[answer]', function (data) {
      // Answers are always forwarded
      if (!self._sockets[data.target]) return
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

  if (handler) {
    self._handlers[event].push(handler)
  } else {
    return new Promise(function (resolve, reject) {
      self._handlers[event].push(resolve)
    })
  }
}

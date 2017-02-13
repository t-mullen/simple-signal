module.exports = SimpleSignalClient

var SimplePeer = require('simple-peer')

function SimpleSignalClient (socket) {
  var self = this
       
  self._handlers = {}
  self._peers = {}
  self.id = null
  self.socket = socket
  
  // Discover own socket.id
  socket.on('connect', function () {  
    socket.emit('simple-signal[discover]')
  })
  socket.on('simple-signal[discover]', function (id) {
    self.id = id
    self._emit('ready')
  })
  
  // Respond to offers
  socket.on('simple-signal[offer]', function (data) {
    self._emit('request', {
      id: data.id,
      accept : function (opts) {
        opts = opts || {}
        opts.initiator = false
        opts.trickle = false // TODO: Get trickle working
        var peer = new SimplePeer(opts)
        
        peer.id = data.id
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
      peer.id = data.id
      self._emit('peer', peer)

      peer.signal(data.signal)
      
      delete self._peers[data.trackingNumber]
    }
  })
}

SimpleSignalClient.prototype._emit = function (event, data) {
  var self = this,
    fns = self._handlers[event] || [],
    fn, i
  
  for (i = 0; i < fns.length; i++) {
    fn = fns[i]
    if (fn && typeof(fn) === 'function') {
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

SimpleSignalClient.prototype.connect = function (id, opts) {
  var self = this
  opts = opts || {}
  opts.initiator = true
  opts.trickle = false // TODO: Get trickle working
  var trackingNumber = window.crypto.getRandomValues(new Uint32Array(3)).join('') // Random tracking number
  
  var peer = new SimplePeer(opts)
  self._peers[trackingNumber] = peer
  
  peer.on('signal', function (signal) {
    self.socket.emit('simple-signal[offer]', {
      signal: signal,
      trackingNumber: trackingNumber,
      target: id
    })
  })
}
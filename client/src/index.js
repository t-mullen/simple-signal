const cuid = require('cuid')
const inherits = require('inherits')
const EventEmitter = require('nanobus')
const SimplePeer = require('simple-peer')

inherits(SimpleSignalClient, EventEmitter)

const ERR_CONNECTION_TIMEOUT = 'ERR_CONNECTION_TIMEOUT'
const ERR_PREMATURE_CLOSE = 'ERR_PREMATURE_CLOSE'

/**
 * SimpleSignalClient
 *
 * @param {Socket} socket Socket
 * @param {Object} options
 * @param {number} [options.connectionTimeout=10000] Defines a timeout for establishing a connection.
 */
function SimpleSignalClient (socket, options = {}) {
  if (!(this instanceof SimpleSignalClient)) return new SimpleSignalClient(socket)

  EventEmitter.call(this)

  const { connectionTimeout = 10 * 1000 } = options

  this.id = null
  this.socket = socket
  this._connectionTimeout = connectionTimeout

  this._peers = {}
  this._sessionQueues = {}
  this._timers = new Map()

  this.socket.on('simple-signal[discover]', this._onDiscover.bind(this))
  this.socket.on('simple-signal[offer]', this._onOffer.bind(this))
  this.socket.on('simple-signal[signal]', this._onSignal.bind(this))
  this.socket.on('simple-signal[reject]', this._onReject.bind(this))
}

SimpleSignalClient.prototype._onDiscover = function (data) {
  this.id = data.id
  this.emit('discover', data.discoveryData)
}

SimpleSignalClient.prototype._onOffer = function ({ initiator, metadata, sessionId, signal }) {
  this._sessionQueues[sessionId] = [signal]

  const request = { initiator, metadata, sessionId }
  request.accept = this._accept.bind(this, request)
  request.reject = this._reject.bind(this, request)

  this.emit('request', request)
}

SimpleSignalClient.prototype._accept = function (request, metadata = {}, peerOptions = {}) {
  peerOptions.initiator = false
  const peer = this._peers[request.sessionId] = new SimplePeer(peerOptions)

  peer.on('signal', (signal) => {
    this.socket.emit('simple-signal[signal]', {
      signal,
      metadata,
      sessionId: request.sessionId,
      target: request.initiator
    })
  })

  peer.once('close', () => {
    this._closePeer(request.sessionId)
  })

  // clear signaling queue
  this._sessionQueues[request.sessionId].forEach(signal => {
    peer.signal(signal)
  })
  delete this._sessionQueues[request.sessionId]

  return new Promise((resolve, reject) => {
    this._onSafeConnect(peer, () => {
      this._clearTimer(request.sessionId)

      resolve({ peer, metadata: request.metadata })
    })

    peer.once('close', () => {
      reject({ metadata: { code: ERR_PREMATURE_CLOSE } })
    })

    this._startTimer(request.sessionId, metadata => {
      reject({ metadata })
      this._closePeer(request.sessionId)
    })
  })
}

SimpleSignalClient.prototype._reject = function (request, metadata = {}) {
  // clear signaling queue
  delete this._sessionQueues[request.sessionId]
  this._clearTimer(request.sessionId)
  this.socket.emit('simple-signal[reject]', {
    metadata,
    sessionId: request.sessionId,
    target: request.initiator
  })
}

SimpleSignalClient.prototype._onReject = function ({ sessionId, metadata }) {
  const peer = this._peers[sessionId]
  if (peer) peer.reject(metadata)
}

SimpleSignalClient.prototype._onSignal = function ({ sessionId, signal, metadata }) {
  const peer = this._peers[sessionId]
  if (peer) {
    peer.signal(signal)
    if (metadata !== undefined && peer.resolveMetadata) peer.resolveMetadata(metadata)
  } else {
    this._sessionQueues[sessionId] = this._sessionQueues[sessionId] || []
    this._sessionQueues[sessionId].push(signal)
  }
}

SimpleSignalClient.prototype.connect = function (target, metadata = {}, peerOptions = {}) {
  if (!this.id) throw new Error('Must complete discovery first.')

  peerOptions.initiator = true

  const sessionId = cuid() // TODO: Use crypto
  var firstOffer = true
  const peer = this._peers[sessionId] = new SimplePeer(peerOptions)

  peer.once('close', () => {
    this._closePeer(sessionId)
  })

  peer.on('signal', (signal) => {
    const messageType = signal.sdp && firstOffer ? 'simple-signal[offer]' : 'simple-signal[signal]'
    if (signal.sdp) firstOffer = false
    this.socket.emit(messageType, {
      signal, metadata, sessionId, target
    })
  })

  return new Promise((resolve, reject) => {
    peer.resolveMetadata = (metadata) => {
      peer.resolveMetadata = null
      this._onSafeConnect(peer, () => {
        this._clearTimer(sessionId)

        resolve({ peer, metadata })
      })
    }

    peer.reject = (metadata) => {
      reject({ metadata }) // eslint-disable-line
      this._closePeer(sessionId)
    }

    peer.once('close', () => {
      reject({ metadata: { code: ERR_PREMATURE_CLOSE } })
    })

    this._startTimer(sessionId, metadata => peer.reject(metadata))
  })
}

SimpleSignalClient.prototype._onSafeConnect = function (peer, callback) {
  // simple-signal caches stream and track events so they always come AFTER connect
  const cachedEvents = []
  function streamHandler (stream) {
    cachedEvents.push({ name: 'stream', args: [stream] })
  }
  function trackHandler (track, stream) {
    cachedEvents.push({ name: 'track', args: [track, stream] })
  }
  peer.on('stream', streamHandler)
  peer.on('track', trackHandler)
  peer.once('connect', () => {
    setTimeout(() => {
      peer.emit('connect') // expose missed 'connect' event to application
      setTimeout(() => {
        cachedEvents.forEach(({ name, args }) => { // replay any missed stream/track events
          peer.emit(name, ...args)
        })
      }, 0)
    }, 0)
    peer.removeListener('stream', streamHandler)
    peer.removeListener('track', trackHandler)
    callback(peer)
  })
}

SimpleSignalClient.prototype._closePeer = function (sessionId) {
  const peer = this._peers[sessionId]
  this._clearTimer(sessionId)
  delete this._peers[sessionId]
  if (peer) peer.destroy()
}

SimpleSignalClient.prototype._startTimer = function (sessionId, cb) {
  if (this._connectionTimeout !== -1) {
    const timer = setTimeout(() => {
      this._clearTimer(sessionId)
      // metadata err
      cb({ code: ERR_CONNECTION_TIMEOUT })
    }, this._connectionTimeout)
    this._timers.set(sessionId, timer)
  }
}

SimpleSignalClient.prototype._clearTimer = function (sessionId) {
  if (this._timers.has(sessionId)) {
    clearTimeout(this._timers.get(sessionId))
    this._timers.delete(sessionId)
  }
}

SimpleSignalClient.prototype.discover = function (discoveryData = {}) {
  this.socket.emit('simple-signal[discover]', discoveryData)
}

SimpleSignalClient.prototype.peers = function () {
  return Object.values(this._peers)
}

SimpleSignalClient.prototype.destroy = function () {
  this.socket.close()
  this.peers().forEach(peer => peer.destroy())

  this.id = null
  this.socket = null
  this._peers = null
  this._sessionQueues = null
}

module.exports = SimpleSignalClient
module.exports.SimplePeer = SimplePeer
module.exports.ERR_CONNECTION_TIMEOUT = ERR_CONNECTION_TIMEOUT
module.exports.ERR_PREMATURE_CLOSE = ERR_PREMATURE_CLOSE

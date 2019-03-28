const cuid = require('cuid')
const inherits = require('inherits')
const EventEmitter = require('nanobus')
const SimplePeer = require('simple-peer')

inherits(SimpleSignalClient, EventEmitter)

function SimpleSignalClient (socket) {
  if (!(this instanceof SimpleSignalClient)) return new SimpleSignalClient(socket)

  EventEmitter.call(this)

  this.id = null
  this.socket = socket

  this._peers = {}
  this._sessionQueues = {}

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
  peer.on('close', () => {
    peer.destroy()
    delete this._peers[request.sessionId]
  })

  // clear signaling queue
  this._sessionQueues[request.sessionId].forEach(signal => {
    peer.signal(signal)
  })
  delete this._sessionQueues[request.sessionId]

  return new Promise((resolve) => {
    resolve({ peer, metadata: request.metadata })
  })
}

SimpleSignalClient.prototype._reject = function (request, metadata = {}) {
  // clear signaling queue
  delete this._sessionQueues[request.sessionId]
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

  peer.on('close', () => {
    peer.destroy()
    delete this._peers[sessionId]
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
      resolve({ peer, metadata })
    }
    peer.reject = (metadata) => {
      delete this._peers[sessionId]
      peer.destroy()
      reject({ metadata })
    }
  })
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

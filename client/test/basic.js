var test = require('tape')
var io = require('socket.io-client')
var SimpleSignalClient = require('./../src/simple-signal-client')

var TEST_SERVER_URL = 'http://localhost:3000'

// For testing on node, we must provide a WebRTC implementation
var wrtc
if (process.env.WRTC === 'wrtc') {
  wrtc = require('wrtc')
} else if (process.env.WRTC === 'electron-webrtc') {
  wrtc = require('electron-webrtc')()

  wrtc.on('error', function (err, source) {
    if (err.message !== 'Daemon already closed') {
      console.error(err, source)
    }
  })
}

test('construct client', function (t) {
  t.plan(2)

  t.timeoutAfter(10000)

  var socket = io(TEST_SERVER_URL)

  t.doesNotThrow(function () {
    var client = new SimpleSignalClient(socket)
    t.equals(true, !!client)
    socket.emit('close')
  })
})

test('connect two clients', function (t) {
  t.plan(7)

  t.timeoutAfter(10000)

  var socket = io(TEST_SERVER_URL)
  var socket2 = io(TEST_SERVER_URL)

  var client1 = new SimpleSignalClient(socket, {})
  var client2
  var peer2

  client1.on('ready', function (metadata) {
    client2 = new SimpleSignalClient(socket2)

    t.equal(metadata, 'discovery metadata', 'discovery metadata is correct')

    client2.on('ready', function () {
      client2.connect(client1.id, {wrtc: wrtc}, {test: 'test metadata'})
    })

    client1.on('request', function (request) {
      t.equal(request.id, client2.id, 'id of request and client are equal')
      t.equal('test metadata', request.metadata.test, 'request metadata is correct')
      request.accept({wrtc: wrtc}, 'peer metadata')
    })

    client2.on('peer', function (peer) {
      peer2 = peer
      t.equal(peer.metadata, 'peer metadata', 'peer metadata is correct')
      t.equal(client1.id, peer.id, 'id of peer and client should be equal')
    })

    client1.on('peer', function (peer) {
      t.equal(client2.id, peer.id, 'id of peer and client should be equal')

      peer.on('connect', function () {
        t.pass('peers connected')
        peer.destroy()
        peer2.destroy()
        socket.emit('close')
        socket2.emit('close')
      })
    })
  })
})

test('connection redirect by server', function (t) {
  t.plan(4)

  t.timeoutAfter(10000)

  var socket = io(TEST_SERVER_URL)
  var socket2 = io(TEST_SERVER_URL)

  var client1 = new SimpleSignalClient(socket, {})
  var client2
  var peer2

  client1.on('ready', function () {
    client2 = new SimpleSignalClient(socket2)

    client2.on('ready', function () {
      client2.connect('some invalid id (used promise)', {wrtc: wrtc}, {redirect: client1.id})
    })

    client1.on('request', function (request) {
      t.equal(request.id, client2.id, 'id of request and client should be equal')
      request.accept({wrtc: wrtc})
    })

    client2.on('peer', function (peer) {
      peer2 = peer
      t.equal(client1.id, peer.id, 'id of peer and client should be equal (used promise)')
    })

    client1.on('peer', function (peer) {
      t.equal(client2.id, peer.id, 'id of peer and client should be equal')

      peer.on('connect', function () {
        t.pass('peers connected')
        peer.destroy()
        peer2.destroy()
        socket.emit('close')
        socket2.emit('close')
      })
    })
  })
})

test('SUMMARY', function (t) {
  t.end()
  if (process && process.exit) {
    process.exit(0)
  }
})

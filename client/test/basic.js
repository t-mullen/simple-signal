var test = require('tape')
var common = require('./common')
var io = require('socket.io-client')
var SimpleSignalClient = require('./../src/simple-signal-client')

var TEST_SERVER_URL = 'http://localhost:3000'

var config
test('get config', function (t) {
  common.getConfig(function (err, _config) {
    if (err) return t.fail(err)
    config = _config
    t.end()
  })
})

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

    t.equal(metadata, 'discovery metadata', 'discovery metadata should be "discovery metadata"')

    client2.on('ready', function () {
      client2.connect(client1.id, {config: config, wrtc: common.wrtc}, {test: 'test metadata'})
    })

    client1.on('request', function (request) {
      t.equal(request.id, client2.id, 'id of request and client should be equal')
      t.equal('test metadata', request.metadata.test, 'metadata should be "test metadata"')
      request.accept({config: config, wrtc: common.wrtc}, 'answer metadata')
    })

    client2.on('peer', function (peer) {
      peer2 = peer
      t.equal(peer.metadata, 'answer metadata', 'answer metadata should be "answer metadata"')
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
      client2.connect('some invalid id', {config: config, wrtc: common.wrtc}, {redirect: client1.id})
    })

    client1.on('request', function (request) {
      t.equal(request.id, client2.id, 'id of request and client should be equal')
      request.accept({config: config, wrtc: common.wrtc})
    })

    client2.on('peer', function (peer) {
      peer2 = peer
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

test('SUMMARY', function (t) {
  t.end()
  if (process) {
    process.exit(0)
  }
})

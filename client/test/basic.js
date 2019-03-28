const test = require('tape')
const io = require('socket.io-client')
const SimpleSignalClient = require('./../src/index')

const TEST_SERVER_URL = 'http://localhost:3000'

// For testing on node, we must provide a WebRTC implementation
var wrtc
if (process.env.WRTC === 'wrtc') {
  wrtc = require('wrtc')
}
const config = { wrtc }

test('construct client', function (t) {
  t.plan(2)

  var socket = io(TEST_SERVER_URL)

  t.doesNotThrow(function () {
    var client = new SimpleSignalClient(socket)
    t.equals(true, !!client)
    socket.emit('close')
  })
})

test('connect two clients', function (t) {
  t.plan(11)

  const socket1 = io(TEST_SERVER_URL)
  const socket2 = io(TEST_SERVER_URL)

  const client1 = new SimpleSignalClient(socket1)
  const client2 = new SimpleSignalClient(socket2)

  client1.discover()
  client1.on('discover', (discoveryData) => {
    client2.discover()

    client1.on('discover', async (request) => {
      t.fail('client1 got excess discover events')
    })

    t.equal(client1.id.slice(0, 3), 'abc', 'client1 id is correct')
    t.equal(discoveryData, 'discovery metadata', 'discoveryData is correct')

    client2.on('discover', async (discoveryData) => {
      t.equal(client2.id.slice(0, 3), 'abc', 'client1 id is correct')
      t.equal(discoveryData, 'discovery metadata', 'discoveryData is correct')

      client2.on('discover', async (request) => {
        t.fail('client2 got excess discover events')
      })

      const { peer, metadata } = await client2.connect(client1.id, { test: 'a' }, config)
      t.assert(peer instanceof SimpleSignalClient.SimplePeer)
      t.equals(metadata.test, 'b', 'response metadata is correct')
    })

    client1.on('request', async (request) => {
      t.equal(request.initiator, client2.id, 'id of request and client are equal')
      t.equal(request.metadata.test, 'a', 'request metadata is correct')

      client1.on('request', async (request) => {
        t.fail('client1 got excess request events')
      })

      const { peer, metadata } = await request.accept({ test: 'b' }, config)
      t.assert(peer instanceof SimpleSignalClient.SimplePeer)
      t.equal(metadata.test, 'a', 'request metadata is correct')

      peer.on('connect', () => {
        t.pass('peers connected')
        client1.destroy()
        client2.destroy()
        t.end()
      })
    })
  })
})

test('connection redirect by server', function (t) {
  t.plan(2)

  const socket1 = io(TEST_SERVER_URL)
  const socket2 = io(TEST_SERVER_URL)

  const client1 = new SimpleSignalClient(socket1)
  const client2 = new SimpleSignalClient(socket2)

  client1.discover()
  client1.on('discover', function () {
    client2.discover()

    client2.on('discover', function () {
      client2.connect('some invalid id', { redirect: client1.id }, config)
    })

    client1.on('request', async function (request) {
      t.equal(request.initiator, client2.id, 'id of request and client should be equal')
      const { peer } = await request.accept({}, config)

      peer.on('connect', () => {
        t.pass('peers connected')
        client1.destroy()
        client2.destroy()
        t.end()
      })
    })
  })
})

test('connect resolves with null metadata', function (t) {
  t.plan(6)

  const socket1 = io(TEST_SERVER_URL)
  const socket2 = io(TEST_SERVER_URL)

  const client1 = new SimpleSignalClient(socket1)
  const client2 = new SimpleSignalClient(socket2)

  client1.discover(null)
  client1.on('discover', (discoveryData) => {
    t.equals(discoveryData, null)
    client2.discover(null)

    client2.on('discover', async (discoveryData) => {
      t.equals(discoveryData, null)
      const { metadata } = await client2.connect(client1.id, null, config)
      t.pass('connect resolved')
      t.equals(metadata, null)
      t.end()
    })

    client1.on('request', async (request) => {
      const { metadata } = await request.accept(null, config)
      t.pass('accept resolved')
      t.equals(metadata, null)
    })
  })
})

test('reject connection', function (t) {
  t.plan(2)

  const socket1 = io(TEST_SERVER_URL)
  const socket2 = io(TEST_SERVER_URL)

  const client1 = new SimpleSignalClient(socket1)
  const client2 = new SimpleSignalClient(socket2)

  client1.discover()
  client1.on('discover', (discoveryData) => {
    client2.discover()

    client2.on('discover', async (discoveryData) => {
      try {
        await client2.connect(client1.id, null, config)
        t.fail('request not rejected')
      } catch (err) {
        t.equals(err.metadata.reason, 'rejected')
        t.end()
      }
    })

    client1.on('request', async (request) => {
      request.reject({ reason: 'rejected' }, config)
      t.pass('request rejected')
    })
  })
})

test('SUMMARY', function (t) {
  t.end()
  if (process && process.exit) {
    process.exit(0)
  }
})

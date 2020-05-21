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
  t.plan(14)

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

    t.equal(client1.id, socket1.id, 'client1 id is correct')
    t.equal(discoveryData, 'discovery metadata', 'discoveryData is correct')

    client2.on('discover', async (discoveryData) => {
      t.equal(client2.id, socket2.id, 'client2 id is correct')
      t.equal(discoveryData, 'discovery metadata', 'discoveryData is correct')

      client2.on('discover', async (request) => {
        t.fail('client2 got excess discover events')
      })

      const { peer, metadata } = await client2.connect(client1.id, { test: 'a' }, config)
      t.assert(peer.connected) // peer is ready
      t.assert(peer instanceof SimpleSignalClient.SimplePeer)
      t.equals(metadata.test, 'b', 'response metadata is correct')
      peer.on('connect', () => { // connect event still fires
        t.pass('connect event 2 fired')
      })
    })

    client1.on('request', async (request) => {
      t.equal(request.initiator, client2.id, 'id of request and client are equal')
      t.equal(request.metadata.test, 'a', 'request metadata is correct')

      client1.on('request', async (request) => {
        t.fail('client1 got excess request events')
      })

      const { peer, metadata } = await request.accept({ test: 'b' }, config)
      t.assert(peer.connected) // peer is ready
      t.assert(peer instanceof SimpleSignalClient.SimplePeer)
      t.equal(metadata.test, 'a', 'request metadata is correct')

      peer.on('connect', () => { // connect event still fires
        t.pass('connect event 1 fired')
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

test('timeout connection on connect', function (t) {
  t.plan(2)

  const socket1 = io(TEST_SERVER_URL)
  const socket2 = io(TEST_SERVER_URL)

  const client1 = new SimpleSignalClient(socket1)
  const client2 = new SimpleSignalClient(socket2, { connectionTimeout: 2000 })

  client1.discover()
  client1.on('discover', (discoveryData) => {
    client2.discover()

    client2.on('discover', async (discoveryData) => {
      try {
        await client2.connect(client1.id, null, config)
        t.fail('request not rejected')
      } catch (err) {
        t.equals(err.metadata.code, SimpleSignalClient.ERR_CONNECTION_TIMEOUT)
        t.end()
      }
    })

    client1.on('request', async (request) => {
      t.pass('new request, do nothing')
    })
  })
})

test('timeout connection on accept', function (t) {
  t.plan(2)

  const socket1 = io(TEST_SERVER_URL)
  const socket2 = io(TEST_SERVER_URL)

  const client1 = new SimpleSignalClient(socket1, { connectionTimeout: 2000 })
  const client2 = new SimpleSignalClient(socket2)

  client1.discover()
  client1.on('discover', (discoveryData) => {
    client2.discover()

    client2.on('discover', async (discoveryData) => {
      try {
        await client2.connect(client1.id, null, config)
        t.fail('connection not premature closed')
      } catch (err) {
        t.equals(err.metadata.code, SimpleSignalClient.ERR_PREMATURE_CLOSE)
      }
    })

    client1.on('request', async (request) => {
      try {
        client2.destroy() // Simulate a disconnection of the remote peer in the middle negotiation.
        await request.accept(null, config)
        t.fail('request not timeout')
      } catch (err) {
        t.equals(err.metadata.code, SimpleSignalClient.ERR_CONNECTION_TIMEOUT)
      }
    })
  })
})

test('SUMMARY', function (t) {
  t.end()
  if (process && process.exit) {
    process.exit(0)
  }
})

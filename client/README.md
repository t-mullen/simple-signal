# simple-signal

[![Build Status](https://travis-ci.org/t-mullen/simple-signal.svg?branch=master)](https://travis-ci.org/t-mullen/simple-signal) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

**Easy signalling for [simple-peer](https://github.com/feross/simple-peer) using [socket.io](https://github.com/socketio/socket.io).**

## Features
- Streamlines WebRTC signaling without losing any flexibility.
- Exposes the entire **simple-peer** API.
- Useful for managing multiple connections.
- Uses modern async/await.

## Install
Server:
```
npm install simple-signal-server --save
```

Client (with Browserify):
```
npm install simple-signal-client --save
```

Without Browserify, use [simple-signal-client.min.js](https://github.com/t-mullen/simple-signal/releases).

### Example
A common signaling scheme is to connect two clients by having one client "call" the ID of another.

Server:
```javascript
const signalServer = require('simple-signal-server')(io)
const allIDs = new Set()

signalServer.on('discover', (request) => {
  const clientID = request.socket.id // clients are uniquely identified by socket.id
  allIDs.add(clientID) // keep track of all connected peers
  request.discover(Array.from(allIDs)) // respond with id and list of other peers
})

signalServer.on('disconnect', (socket) => {
  const clientID = socket.id
  allIDs.delete(clientID)
})

signalServer.on('request', (request) => {
  request.forward() // forward all requests to connect
})
```

Client:
```javascript
var signalClient = new SimpleSignalClient(socket) // Uses an existing socket.io-client instance

signalClient.on('discover', async (allIDs) => {
  const id = await promptUserForID(allIDs) // Have the user choose an ID to connect to
  const { peer } = await signalClient.connect(id) // connect to target client
  peer // this is a fully-signaled simple-peer object (initiator side)
})

signalClient.on('request', async (request) => {
  const { peer } = await request.accept() // Accept the incoming request
  peer // this is a fully-signaled simple-peer object (non-initiator side)
})

signalClient.discover()
```

## Client API

### `signalClient = new SignalClient(socket, [options])`
Create a new signalling client.

Required `socket` is a **socket.io-client** instance.

Options:

- `connectionTimeout: number = 10000`: Defines the time to wait to establish a connection.

### `signalClient.id`
The identifying string for this client's socket. `null` until discovery completes.

### `signalClient.discover(discoveryData)`
Initiate discovery.

`discoveryData` is any discovery data to be sent to the server.

### `{ peer, metadata } = await signalClient.connect(id, [metadata], [peerOptions])`
Request to connect to another client. Returns a Promise.

`id` is the `signalClient.id` of the other client.

Optional `metadata` is any serializable object to be passed along with the request.

Optional `peerOptions` are the options to be passed to the `SimplePeer` constructor.

### `signalClient.on('discover', function (discoveryData) {})`
Fired when the client has connected to the server and done discovery.

`discoveryData` is any additional data that has been passed by the server.

### `signalClient.on('request', function (request) {})`
Fired on receiving a request to connect from another client.

#### `request.initiator`
The id of the remote client's socket.

#### `request.metadata`
Any additional metadata passed by the requesting client or server.

#### `{ peer, metadata } = await request.accept([metadata], [peerOptions])`
Accept the request to connect. *Not calling this method will ignore the request.*  Returns a Promise.

`metadata` is any serializable object to be passed along with the answer.

`peerOptions` are the options to be passed to the `SimplePeer` constructor.

Promise will reject if the other side calls `reject()`.

#### `request.reject([metadata])`
Rejects the request to connect. *Not calling this method will ignore the request.*

`metadata` is any serializable object to be passed along with the rejection.

### `signalClient.peers()`
List all currently connecting/connected peers. Returns an array of `SimplePeer` objects.

## Server API

### `signalServer = require('simple-signal-server')(io)`
Create a new signalling server.

Required `io` is a **socket.io** instance.

### `signalServer.on('discover', function (request) {})`
Optional listener allows you to return additional discovery data when a new client connects or rediscovers.

#### `request.socket`
The `socket.io` socket used by the client initiating discovery.

#### `request.discoveryData`
Any additional data passed by the discovering client. A good place for credentials.

#### `request.discover([discoveryData])`
Allow discovery to continue. *Listening to "discover" and not calling this method will block discovery.*

Optional `discoveryData` is any serializable object to be passed along with the discovery response. A good place for credentials.

### `signalServer.on('request', function (request) {})`
Optional listener allows you to filter connection requests on the server.

#### `request.initiator`
`id` of the socket used by the client initiating the request.

#### `request.target`
`id` of the socket used by the client that will receive the request.

#### `request.metadata`
Any additional metadata passed by the requesting client.

#### `request.forward([metadata])`
Allow the request to continue. *Listening to "request" and not calling this method will block the request.*

Optional `metadata` is any serializable object to be passed along with the request.

### `signalServer.on('disconnect', function (socket) {})`
Listens to disconnected sockets. Similar to the `socket.io` `disconnect` event, but only fires for clients that completed discovery.

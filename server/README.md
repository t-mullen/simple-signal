# simple-signal 

[![Build Status](https://travis-ci.org/t-mullen/simple-signal.svg?branch=master)](https://travis-ci.org/t-mullen/simple-signal) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)


**Easy signalling for [simple-peer](https://github.com/feross/simple-peer) using [socket.io](https://github.com/socketio/socket.io).**

## Features

- Streamlines WebRTC signalling without losing any flexibility

- Exposes the entire **simple-peer** API

- Useful for managing multiple connections

## Install

Server:
```
npm install simple-signal-server --save
```

Client (with Browserify):  
```
npm install simple-signal-client --save
```

## Usage

The server uses an existing **socket.io** instance.  

Let's connect each client to the last client that connected.      

```javascript
var signalServer = require('simple-signal-server')(io)  

var lastId = null
signalServer.on('discover', function (request) {
  request.discover(lastId)
  lastId = request.initiator.id
})
```

On the client:

```javascript
var signalClient = new SimpleSignalClient(socket) // Needs an existing socket.io-client instance

signalClient.on('ready', function(lastId) {
  if (lastId) signalClient.connect(lastId) // Start connection
})

signalClient.on('request', function (request) {
  request.accept() // Accept a request to connect
})

signalClient.on('peer', function (peer) {
  peer // A fully signalled SimplePeer object
  
  // Use as you would any SimplePeer object
  peer.on('connect', function () {
    peer.send('hey! We are connected')
  })
})
```

In this example, all clients will be connected in a long chain. You can easily create all kinds of networks!  

### A simpler example

A common signaling scheme is to connect just two clients by having one client "call" the ID of another.

Server:
```javascript
var signalServer = require('simple-signal-server')(io) // This is all the server code needed!
```

Client:
```javascript
var signalClient = new SimpleSignalClient(socket) // Needs an existing socket.io-client instance

signalClient.on('ready', function() {
  promptUserForID(function (id) { // get the target client's ID somehow
    signalClient.connect(id) // connect to target client
  })
})

signalClient.on('request', function (request) {
  request.accept() // Accept a request to connect
})
```

## Client API

### `signalClient = new SignalClient(socket, [discoveryData])`  

Create a new signalling client.  

Required `socket` is a **socket.io-client** instance.

Optional `discoveryData` is any serializable data to be passed during discovery.

### `signalClient.id`  

The identifying string for this client's socket. Identical to `socket.id`.  

### `signalClient.connect(id, [opts], [metadata])`  

Request to connect to another client.  

`id` is the `signalClient.id` of the other client.  

`opts` are the options to be passed to the `SimplePeer` constructor.  

Optional `metadata` is any serializable object to be passed along with the request.

### `signalClient.disconnect(id)`  

Disconnect from or cancel connection to a single client. 

`id` is the `signalClient.id` of the other client.  

### `signalClient.on('ready', function (discoveryData) {})`  

Fired when the client has connected to the server and done discovery.

`discoveryData` is any additional data that has been passed by the server.

### `signalClient.on('request', function (request) {})`  

Fired on receiving a request to connect from another client. 

#### `request.id`  

The id of the remote client's socket.  

#### `request.metadata`

Any additional metadata passed by the requesting client or server.

#### `request.accept([opts], [metadata])`  

Accept the request to connect. *Not calling this method will block the request.*  

`opts` are the options to be passed to the `SimplePeer` constructor.  

`metadata` is any serializable object to be passed along with the answer.

### `signalClient.on('peer', function (peer) {})`  

Fired when signalling is completed. Passes a signalled `SimplePeer` object.  

The unique identifier of the remote client's socket is available as `peer.id`.  

Any metadata associated with the request/answer is available as `peer.metadata`.

### `signalClient.rediscover(metdata)`  

Initiate rediscovery.

`metadata` is any discovery data returned from the server.  

### `signalClient.peers()`  

List all currently connecting/connected peers. Returns an array of `SimplePeer` objects.

## Server API

### `signalServer = require('simple-signal-server')(io)`  

Create a new signalling server.  

Required `io` is a **socket.io** instance.

### `signalServer.on('discover', function (request) {})`  

Optional listener allows you to return additional discovery data when a new client connects or rediscovers.

#### `request.initiator.id`  

`id` of the socket used by the client initiating discovery.

#### `request.metadata`

Any additional metadata passed by the discovering client.

#### `request.discover([discoveryData])`  

Allow discovery to continue. *Listening to "discover" and not calling this method will block discovery.*  

Optional `discoveryData` is any serializable object to be passed along with the discovery response.  

### `signalServer.on('request', function (request) {})`  

Optional listener allows you to filter connection requests on the server.  

#### `request.initiator.id`  

`id` of the socket used by the client initiating the request.

#### `request.receiver.id`  

`id` of the socket used by the client that will receive the request.

#### `request.metadata`

Any additional metadata passed by the requesting client.

#### `request.forward([id], [metadata])`  

Allow the request to continue. *Listening to "request" and not calling this method will block the request.*  

Optional `id` is the receiver of the request, allowing you to reroute requests to different clients. 

Optional `metadata` is any serializable object to be passed along with the request.  

### `signalServer.on('connect', function (socket) {})`  

Event fires when a socket.io-client connects to the server.

#### `socket`

The socket that connected.

### `signalServer.on('disconnect', function (socket) {})`  

Event fires when a socket.io-client disconnects from the server.

#### `socket`

`The socket that disconnected.

**All methods that use callbacks also support ES6 Promises!**

# simple-signal [![Build Status](https://travis-ci.org/RationalCoding/simple-signal.svg?branch=master)](https://travis-ci.org/RationalCoding/simple-signal) [![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
**Easy signalling for [simple-peer](https://github.com/feross/simple-peer) using [socket.io](https://github.com/socketio/socket.io).**

## Features
- Streamlines WebRTC signalling without losing any flexibility
- Exposes the entire **simple-peer** API

## Install
Server:
```
npm install simple-signal-server
```

Client (without Browserify):
```html
<script src="simple-signal-client.js"></script>
```

## Usage
Let's connect each peer to the peer that connected previously.    
The server uses an existing **socket.io** instance.
```javascript
var signalServer = require('simple-signal-server')(io)  

var lastId = null
signalServer.on('discover', function (id) {
  if (lastId) return lastId
  firstId = id
})
```
On the client:
```javascript
var signalClient = new SimpleSignalClient(socket)

signalClient.on('ready', function(lastId) {
  signalClient.id // This client's unique identifier
  
  if (lastId) {
    signalClient.connect(lastId) // Start signalling
  }
})

signalClient.on('request', function (request) {
  request.id // The id of the other peer
  request.accept()
})

signalClient.on('peer', function (peer) {
  peer // A fully signalled SimplePeer object
  
  // Use as you would any SimplePeer object
  peer.on('connect', function () {
    peer.send('hey! We are connected')
  })
})
```

## Client API
###`signalClient = new SignalClient(socket, [discoveryData])`  
Create a new signalling client.  

Required `socket` is a **socket.io-client** instance.

Optional `discoveryData` is any serializable data to be passed during discovery.

###`signalClient.id`  
The identifying string for this peer. Identical to `socket.id`.  

###`signalClient.connect(id, [opts], [metadata])`  
Request to connect to another peer.  

`id` is the `signalClient.id` of the other peer.  

`opts` are the options to be passed to the `SimplePeer` constructor.  

Optional `metadata` is any serializable object to be passed along with the request.

###`signalClient.on('peer', function (discoveryData) {})`  
Fired when the client has connected to the server and done discovery.

`discoveryData` is any additional data that has been passed by the server.

###`signalClient.on('request', function (request) {})`  
Fired on receiving a request to connect from another peer. 

###`request.id`  
The id of the remote peer.  

###`request.metadata`
Any additional metadata passed by the requesting peer or server.

###`request.accept([opts], [metadata])`  
Accept the request to connect.  

`opts` are the options to be passed to the `SimplePeer` constructor.  

`metadata` is any serializable object to be passed along with the answer.

###`signalClient.on('peer', function (peer) {})`  
Fired when signalling is completed. Passes a signalled `SimplePeer` object.  

The unique identifier of the remote peer is available as `peer.id`.  

Any metadata associated with the request/answer is available as `peer.metadata`.

###`signalClient.rediscover(metdata)`  
Initiate rediscovery.

`metadata` is any discovery data returned from the server.  

## Server API
###`signalServer = require('simple-signal-server')(io)`  
Create a new signalling server.  

Required `io` is a **socket.io** instance.

###`signalServer.on('discover', function (id, discoveryData) {})`  
Optional listener allows you to return additional discovery data when a new client connects or rediscovers.

`id` is the `peer.id` of the client connecting.

`discoveryData` is any data passed into the `SimpleSignalClient` constructor.

Any value returned from the callback will be passed to the `ready` event on the client.

###`signalServer.on('request', function (request) {})`  
Optional listener allows you to filter connection requests on the server.  

###`request.initiator.id`  
`id` of the peer initiating the request.

###`request.receiver.id`  
`id` of the peer that will receive the request.

###`request.metadata`
Any additional metadata passed by the requesting peer.

###`request.forward([id], [metadata])`  
Allow the request to continue. *Not calling this method will block the request.*  

Optional `id` is the receiver of the request, allowing you to reroute requests to different peers. 

Optional `metadata` is any serializable object to be passed along with the request.

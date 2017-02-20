# simple-signal
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
```
<script src="simple-signal-client.min.js></script>
```

## Usage
The server uses an existing **socket.io** instance.
```javascript
var signalServer = require('simple-signal-server')(io)
```
On the client:
```javascript
var signalClient = new SimpleSignalClient(socket)

// Wait until a connection to the server is established
signalClient.on('ready', function() {
  signalClient.id // You can now access your own peer id
  
  // Initiate signalling to another peer
  // otherID is the id of the peer you want to connect to
  signalClient.connect(otherID)
})

// Fires on a request to connect
signalClient.on('request', function (request) {
  request.id // The id of the other peer
  request.accept()
})

// Fires when signalling is completed
signalClient.on('peer', function (peer) {
  peer // A fully signalled SimplePeer object
  
  // Use as you would any SimplePeer object
  peer.on('connect', function () {
    peer.send('hey! We are connected')
  })
})
```

## Client API
###`signalClient = new SignalClient(socket)`  
Create a new signalling client.  

Required `socket` is a **socket.io-client** instance.

###`signalClient.id`  
The identifying string for this peer. Identical to `socket.id`.  

###`signalClient.connect(id, [opts], [metadata])`  
Request to connect to another peer.  

`id` is the `signalClient.id` of the other peer.  

`opts` are the options to be passed to the `SimplePeer` constructor.  

Optional `metadata` is any serializable object to be passed along with the request.

###`signalClient.on('request', function (request) {})`  
Fired on receiving a request to connect from another peer. 

###`request.id`  
The id of the remote peer.  

###`request.accept([opts])`  
Accept the request to connect.  

`opts` are the options to be passed to the `SimplePeer` constructor.  

###`signalClient.on('peer', function (peer) {})`  
Fired when signalling is completed. Passes a signalled `SimplePeer` object.  

The `id` of the remote peer is added as `peer.id`.  

## Server API
###`signalServer = require('simple-signal-server')(io)`  
Create a new signalling server.  

Required `io` is a **socket.io** instance.

###`signalServer.on('request', function (request) {})`  
Optional listener allows you to filter connection requests on the server.  

###`request.initiator.id`  
`id` of the peer initiating the request.

###`request.receiver.id`  
`id` of the peer that will receive the request.

###`request.forward([id], [metadata])`  
Allow the request to continue. *Not calling this method will block the request.*  

Optional `id` is the receiver of the request, allowing you to reroute requests to different peers. 

Optional `metadata` is any serializable object to be passed along with the request.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

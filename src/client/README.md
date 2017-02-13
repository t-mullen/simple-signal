# simple-signal
**Easy signalling for [simple-peer](https://github.com/feross/simple-peer) using [socket.io](https://github.com/socketio/socket.io).**

## Features
- streamlines WebRTC signalling without losing any flexibility
- exposes the entire **simple-peer** API

## Install
Client (without Browserify):
```
<script src="simple-signal-client.js></script>
```

## Usage
Uses an existing **socket.io-client** instance:
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

###`signalClient.connect(id, [opts])`  
Request to connect to another peer.  
`id` is the `signalClient.id` of the other peer.  
`opts` are the options to be passed to the `SimplePeer` constructor.  

###`signalClient.on('request', function (request) {})`  
Fired on receiving a request to connect from another peer. 

###`request.id`  
The id of the other peer.  

###`request.accept([opts])`  
Accept the request to connect.  
`opts` are the options to be passed to the `SimplePeer` constructor.  

###`signalClient.on('peer', function (peer) {})`  
Fired when signalling is completed. Passes a signalled `SimplePeer` object.
# simple-signal
**Easy signalling for [simple-peer](https://github.com/feross/simple-peer) using [socket.io](https://github.com/socketio/socket.io).**

## Features
- streamlines WebRTC signalling without losing any flexibility
- exposes the entire **simple-peer** API

## Install
Server:
```
npm install simple-signal-server
```


## Usage
The server uses an existing **socket.io** instance.
```javascript
var signalServer = require('simple-signal-server')(io)
```

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

###`request.forward([id])`  
Allow the request to continue. Not calling this method will block the request.  
Optional `id` is the receiver of the request, allowing you to reroute requests to different peers.  

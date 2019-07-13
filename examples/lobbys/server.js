const io = require('socket.io')() // create a socket.io server
var SimpleSignalServer = require('./../../server/src/index') // require('simple-signal-server')
var signal = new SimpleSignalServer(io)

// here we hardcode some fixed rooms, but you could easily create them dynamically
const rooms = {
	'Room One' : new Set(),
	'Room Two' : new Set(),
	'Room Three' : new Set()
}

// when a peer starts, it will request a list of rooms
// after that, it will request peers in a specific room
signal.on('discover', (request) => {
	if (!request.discoveryData) { // return list of rooms
		request.discover(request.socket.id, {
			rooms: Object.keys(rooms)
		})
	} else { // return peers in a room
		const roomID = request.discoveryData
		request.discover(request.socket.id, {
			roomResponse: roomID, // return the roomID so client can correlate discovery data
			peers: Array.from(rooms[roomID])
		})
		if (request.socket.roomID) { // if peer was already in a room
			console.log(request.socket.id, 'left room', request.socket.roomID)
			rooms[request.socket.roomID].delete(request.socket.id) // remove peer from that room
		}
		if (request.socket.roomID !== roomID) { // if peer is joining a new room
			request.socket.roomID = roomID // track the current room in the persistent socket object
			console.log(request.socket.id, 'joined room', roomID)
			rooms[roomID].add(request.socket.id) // add peer to new room
		}
	}
})

console.log('Running lobbys demo!')
io.listen(3000)

var signalServer = require('simple-signal-server')(io)

// Optional server-side control
signalServer.on('request', function(request) {
    request.initiator.id
    request.receiver.id
    request.forward()
    //or
    request.forward(someOtherId)
})



var signalClient = new SimpleSignalClient(socket)

signalClient.on('ready', function() {

    signalClient.id

    signalClient.connect(id, opts)

    signalClient.on('request', function(request) {
        request.id
        request.accept(opts)
    })

    signalClient.on('peer', function(peer) {
        peer // connected simple-peer object
    })
})

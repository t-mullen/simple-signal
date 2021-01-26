
# Build simple-signal-client.js  
$ cd $PROJECT/client  
$ npm run build-lobbys  


Edit examples/lobbys/js/simple-signal-client.js. 
To change context from this code  
<pre>
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
</pre>
to the following code.    
<pre>
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        console.log("Unknown Error and er = ")
        console.log(er)
        if (er.code === "ERR_DATA_CHANNEL") {
          console.log("er.code = ")
          console.log(er.code)
        } else {
          throw err;
        }
      }
</pre>  

These code is currently ignore ERR_DATA_CHANNEL and it can make sure dynamically room and peer be stable.  
We need this code until we know how to catch all ERR_DATA_CHANNEL error.   
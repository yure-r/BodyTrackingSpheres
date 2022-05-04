let port = process.env.PORT || 8000;
let express = require('express');
let app = express();
let server = require('http').createServer(app).listen(port, function(){
  console.log('Server is listening at port: ', port);

});

app.use(express.static('public'));

const io = require("socket.io")(server, {
  cors: {
    origins: [
      "http://autonomylab-blazepose-bodytracking.glitch.me",
      "http://autonomylab-blazepose-bodytracking.glitch.me",
      "http://marionette-final.glitch.me",
      "https://marionette-final.glitch.me"
    ],
    methods: ["GET", "POST"]
  }
});



io.on('connection', function (socket) {

  socket.on('results', function(data){
    // console.log(data)
  socket.broadcast.emit('sphereMove', {data})
  })

});
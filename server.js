let port = process.env.PORT || 8000;
let express = require('express');
let app = express();
let server = require('http').createServer(app).listen(port, function(){
  console.log('Server is listening at port: ', port);
  // console.log(server)
});

app.use(express.static('public'));

// let io = require('socket.io').listen(server) /* create socket connection */
const io = require("socket.io")(server, {
  cors: {
    origins: [
      // "https://remixed-endofyearshow2021.glitch.me",
      // "https://endofyearshow2021.glitch.me", 
      // "https://endofyearshow2021-socket-vuex.glitch.me", 
      // "http://endofyearshow2021.cooper.edu", 
      // "https://endofyearshow2021.cooper.edu",
      // "http://localhost"
      "http://autonomylab-blazepose-bodytracking.glitch.me",
      "http://autonomylab-blazepose-bodytracking.glitch.me"
    ],
    methods: ["GET", "POST"]
  }
});

var stepID = 0;
var friendsGroup = [];
var totalUsers = (friendsGroup.length+1);
function isLegit(friend){
if (!friend.id){
  friendsGroup.splice(friendsGroup.indexOf(friend), 1)
}
}

function movedNow(friend, socket){
  if (friend.lastmove){
        const millis = Date.now() - friend.lastmove;
        const seconds = Math.floor(millis / 1000);
        const minutes = Math.floor(seconds/60)
        if (minutes > 2){
          const friendDex = friendsGroup.indexOf(friend)
          const friendLength = friendsGroup.length-1
          // console.log("friendLength", friendLength)
          socket.broadcast.emit('notConnected',{connections:friendLength, friend: friendsGroup[friendDex].id});
          friendsGroup.splice(friendsGroup[friendDex], 1)
        } else {
          // console.log(minutes)
        }
  } else {
    // console.log(friend)
    // console.log("no lastmove :( there should be :O")
  }
}

function checkFriends(socket){
  friendsGroup.forEach(friend => movedNow(friend, socket))
  // console.log(friendsGroup)
  // console.log("friendsGroiup^")
}

io.on('connection', function (socket) {
  const _id = stepID
  stepID++
  // console.log("new socket", _id)
  // console.log(friendsGroup.length)
  totalUsers = friendsGroup.length
  // console.log(totalUsers)
  friendsGroup.push(_id);   /* new id */
  var thisID = _id
  // totalUsers++;
  socket.on('results', function(data){
    // console.log(data)
  socket.broadcast.emit('sphereMove', {data})
  })
    socket.on('nameChosen',function(data){
      const playerId = data.player
      const name = data.response.name
      const role = data.response.role
      const completePlayer = {
        id: playerId,
        name: name,
        role: role,
        lastLocation: [0, 0]
      }
      if (friendsGroup.indexOf(playerId)){
    friendsGroup[friendsGroup.indexOf(playerId)] = completePlayer
      socket.broadcast.emit('name updated', {data:completePlayer})
      socket.broadcast.emit('nameUpdated', {data:completePlayer})
        friendsGroup.forEach(friend => isLegit(friend))
      }else{
        friendsGroup.push(completePlayer)
      socket.broadcast.emit('name updated', {data:completePlayer})
      socket.broadcast.emit('nameUpdated', {data:completePlayer})
      }

  });
  friendsGroup.forEach(friend => isLegit(friend))
  totalUsers = friendsGroup.length
  io.emit('connected', { connections: totalUsers });   /* new connection ALL */
  socket.broadcast.emit('new friend', { friend: thisID  });   /* new connection friends */
  socket.broadcast.emit('newFriend', { friend: thisID  });   /* new connection friends */
  socket.emit('init',{ player:thisID, friends: friendsGroup });   /* new connection self */
  
  socket.on('disconnect', function (){
    const _id = stepID
    var i = 0;
    for(i in friendsGroup){
    if(friendsGroup[i].id === thisID){
      friendsGroup.splice(i,1);
    }
  }
    friendsGroup = friendsGroup
    // totalUsers--;
    totalUsers = friendsGroup.length
    socket.broadcast.emit('bye friend',{connections:totalUsers, friend: thisID});
     socket.broadcast.emit('byeFriend',{connections:totalUsers, friend: thisID});
    console.log('Socket disconnected: ' + _id)
  });   /* disconnect friends */
  
  socket.on('isChild', function(data){
    console.log(data)
    console.log("isChild")
    data = data.slice(7);
    console.log(data)
    
function search(nameKey, myArray){
    for (var i=0; i < myArray.length; i++) {
        if (myArray[i].id === nameKey) {
            return myArray[i];
        }
    }
}

var index = search(data, friendsGroup);
    
    console.log(index)
    if (index){
    } else{
     socket.emit('bye friend',{connections:totalUsers, friend: data});
     socket.emit('byeFriend',{connections:totalUsers, friend: data});
    }
  })
  
  socket.on('move',function(data){
    // console.log(data)
    const index = friendsGroup.findIndex(function(item, i){
    return item.id === data.friend
    });
    if (index > -1){
      friendsGroup[index].lastLocation = [data.friendX, data.friendY]   
      friendsGroup[index].lastmove = Date.now()
    } else if (!index){
            const completePlayer = {
        id: data.friend,
        name: data.name,
        role: data.role,
        lastLocation: [data.friendX, data.friendY],
        lastmove: Date.now()
      }
            friendsGroup.push(completePlayer)
    }
    
      checkFriends(socket);
      // data.users = friendsGroup.length
      totalUsers = (friendsGroup.length+1)
      socket.broadcast.emit('move', data);
  });
  
  //test functions for vuex
  socket.on('test update', (data)=>{
    // console.log('test update triggered', data)
    // io.emit('user_message', data)
    
//     console.log('test mutation triggered', data)
//     io.emit('SOCKET_MUTATION_TEST', data + ' mutation')
    
    console.log('test socket_userMessage action triggered', data)
    io.emit('socket_userMessage', data + ' action')    
  })
  
  socket.on('vue_sendMessage', (data)=>{
    console.log('vue_sendMessage received', data)
    io.emit('user_message', data)
  })
  
  socket.on('client_userMessage', (data)=>{
    console.log('client_userMessage received from vue app', data)
    //send to everyone except the sender
    //via https://socket.io/docs/v3/emit-cheatsheet/index.html
    socket.broadcast.emit('socket_userMessage', data)
  })
});
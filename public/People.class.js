class Player {
  constructor(id, socket, name, role) {
    this.id = id
    this.x = 0
    this.y = 0
    this.name = name
    this.role = role
    this.socket = socket
  }
  
  update(x,y,socket) {
    this.x = ((x / window.innerWidth) * 100).toFixed(2);
    this.y = ((y / window.innerHeight) * 100).toFixed(2); 
    this.emit(socket)
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      name: this.name,
      role: this.role
    }
    
  }
  
  emit(socket) {
    socket.emit('move',{ friend: this.id, friendX: this.x, friendY: this.y, name: this.name, role: this.role});
  }
  
}

class Friend extends Player {
  
  constructor(id, name, role){
    super()
    this.id = id;
    this.x  = 0;
    this.y  = 0;
    this.dx = 0;
    this.dy = 0;
    this.idx = 'friend-'+id;
    this.name = name
    this.role = role
    this.element = false;
  }
  
  newFriends(socket){
        socket.Friends = {}
  }
  
  message(msg) {
    console.log(msg)
  }
  
  add(friend, friends, fullFriend){
    const label = this.doLabel(friend.id);
    this.idx = label;
    if (!document.getElementById(label)){
    if (this.idx != "friend-undefined" && fullFriend){
    console.log(fullFriend.name)
    console.log(fullFriend.role)
    friends[label] = friend;
    this.element = document.createElement("div")
    this.element.id = this.idx
    this.element.classList.add('friend')
    this.element.classList.add(fullFriend.role)
    const name = document.createElement("div")
    name.classList.add("name")
    name.classList.add(fullFriend.role)
    name.innerHTML = fullFriend.name
    this.element.appendChild(name)
    document.getElementById("cursorscontainer").appendChild(this.element)
    document.getElementById(label).style.left = fullFriend.lastLocation[0] + '%' 
    document.getElementById(label).style.top = fullFriend.lastLocation[1] + '%'
    } else if (this.idx != "friend-undefined"){
    friends[label] = friend;
    this.element = document.createElement("div")
    this.element.id = this.idx
    this.element.classList.add('friend')
    document.getElementById("cursorscontainer").appendChild(this.element)
    }
    }
    }
   
  
  remove(id, friends){
    const label = this.doLabel(id);
    if (document.getElementById(label)){
    document.getElementById(label).remove()
    }
    
    if ( friends[label] ) {
        delete friends[label];
    }

  }
  
  update(data, friends){
    const label = this.doLabel(data.friend);
    // console.log(data)    
    if (document.getElementById(label)){
    document.getElementById(label).style.left = data.friendX + '%' 
    document.getElementById(label).style.top = data.friendY + '%'
    } else {
      console.log(data)
    if (label != "friend-undefined"){
    const friend = new Friend(data.friend, data.name, data.role);
    if (friend) {
    friends[label] = friend;
    this.element = document.createElement("div")
    this.element.id = label
    this.element.classList.add('friend')
    this.element.classList.add(data.role)
    const name = document.createElement("div")
    name.classList.add("name")
    name.classList.add(data.role)
    name.innerHTML = data.name
    this.element.appendChild(name)
    document.getElementById("cursorscontainer").appendChild(this.element)
    document.getElementById(label).style.left = data.friendX + '%' 
    document.getElementById(label).style.top = data.friendY + '%'
      }
    }
    }
  }
  
  updateName(id, player, Meeting, name, role, fullFriend){
    const label = this.doLabel(id);
    // console.log(label)
    // console.log(document.getElementById(label).classList.contains(role))
    if (!document.getElementById(label).classList.contains(role)){
    document.getElementById(label).classList.add(role)
    const newName = document.createElement("div")
    newName.classList.add("name")
    newName.classList.add(role)
    newName.innerHTML = name
    if (document.getElementById(label).children.length < 2 ){
    document.getElementById(label).appendChild(newName)
    }
    }
  }
  
  doLabel(id){
    return 'friend-'+id;
  }
  
}

class Meeting {
  constructor(){
        this.player = false;
        this.friends = {}
        this.friend = new Friend();
        Meeting.bind(this)
  }
  
  createFriend(id, player, friends, name, role, fullFriend){
    if ( player && player == id ) {
    return;
    }
    const friend = new Friend(id, name, role);
    if (friend) {
        this.friend.add(friend, friends, fullFriend);
    }
    
  }
  
  removeFriend(self, id, meeting){
    this.friend.remove(id, this.friends);
}
  
  updateFriend(data){
    this.friend.update(data, this.friends)
  }
  
  updateFriendName(id, player, Meeting, name, role, fullFriend){
    this.friend.updateName(id, player, Meeting, name, role, fullFriend)
  }
  
    
}


export {Player, Friend, Meeting}
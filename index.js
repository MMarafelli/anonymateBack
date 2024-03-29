const express = require("express");
const app = express();
const cors = require('cors')
const server = require("http").createServer(app);
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const port = 3000;
const handleError = require('./controllers/handleError');


// app.use(cors())

const dbProd = "mongodb://mmarafelli13:YL34*b5|ep)@kamino.mongodb.umbler.com:43819/anonymatedb";
const dbLocal = "mongodb://localhost/Anonymate";
var dbase;

if (process.env.AMBIENTE == "producao") {
  dbase = dbProd;
  console.log("db de prod")
} else {
  dbase = dbLocal;
  console.log("db local")
}

// Conecta no MongoDB
mongoose.connect(
  dbase,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  }, function (err, db) {
    if (!err) {
      console.log('We are connected');
    } else {
      console.log('Trouble connecting db');
      console.log(err)
    }
  });


// Carrega o model de Usuário
require("./models/user");
require("./models/conversation");
const store = require('./controllers/chatController');

app.use(bodyParser.json());

// Inicia as rotas da API
app.use("/api", require("./controllers/userController"));
app.use("/api", require('./controllers/conversationController'));
// Finaliza as rotas da API

// const example = io(server);
const io = require('socket.io')(server);

io.on('connection', socket => {
  // console.log('connection')
  // console.log(socket)

  //---------------------------------------------------------------------------------
  // Set to offline users that doesnt online anymore
  const socketIds = Object.keys(io.of('/').connected).map(key => key);
  store.setUsersToOffLine(socketIds);
  //---------------------------------------------------------------------------------

  //---------------------------------------------------------------------------------
  // ONLINE
  socket.on('online', newUserId => {
    // console.log('socket online')
    // console.log(newUserId)
    // console.log(socket.id)

    if (typeof newUserId === "undefined" || typeof socket.id === "undefined") {
      return false;
    }

    // console.log('online ok')

    function afterGetAllDatas([user, contacts, chating]) {
      // console.log('afterGetAllDatas')
      socket.user = user;
      //=> EMIT: online
      // console.log(user, contacts, chating)
      socket.emit('online', {
        user,
        contacts,
        chating,
      });
      //=> EMIT:userOnline
      socket.broadcast.emit('userOnline', newUserId);
    }
    Promise.all([
      store.getUserAndUpdate(newUserId, { chatId: socket.id, online: true }),
      store.getContats(newUserId),
      store.getLastMessages(newUserId),
    ])
      .then(afterGetAllDatas)
      .catch(handleError);
  });
  //---------------------------------------------------------------------------------

  //---------------------------------------------------------------------------------
  // OFFLINE
  socket.on('forceDisconnect', () => {
    // console.log('------------xxxxxx-----------')
    // console.log('disconnect')
    // console.log(socket)

    if (typeof socket.user === "undefined" || typeof socket.user.userId === "undefined") {
      return false;
    }

    const userId = socket.user.userId;
    // console.log(userId)
    // console.log(socket.id)
    store.getUserAndUpdate(userId, { id: '', online: false })
      .then(user => {
        //=> EMIT:userOffline
        socket.broadcast.emit('userOffline', userId);
      })
      .catch(handleError);
    socket.disconnect();
    // console.log('------------xxxxxx-----------')
  });

  socket.on('disconnect', () => {
    if (typeof socket.user === "undefined" || typeof socket.user.userId === "undefined") {
      return false;
    }
    const userId = socket.user.userId;
    store.getUserAndUpdate(userId, { id: '', online: false })
      .then(user => {
        //=> EMIT:userOffline
        socket.broadcast.emit('userOffline', userId);
      })
      .catch(handleError);
    socket.disconnect();
  });
  //---------------------------------------------------------------------------------

  //---------------------------------------------------------------------------------
  // HANDLE MESSAGES

  // create first message
  socket.on('createConversation', (conversation) => {
    // console.log('createConversation')

    if (typeof socket.user === "undefined" || typeof socket.user.userId === "undefined") {
      return false;
    }

    store.createConversation(socket.user.userId, conversation).then(newCreatedMessage => {
      socket.emit('newCreatedMessageListener', newCreatedMessage)
    }).catch(handleError);
  })

  //get not delivered messages
  socket.on('getNotDeliveredMessages', () => {
    // console.log('bateu no get not delivered messages')
    // console.log(socket.user)
    // console.log(socket.user.userId)
    if (typeof socket.user === "undefined" || typeof socket.user.userId === "undefined") {
      return false;
    }
    // console.log('bateu no get not delivered messages ok ')
    store.getLastMessagesNotDelivered(socket.user.userId).then(lastMessages => {
      socket.emit('getNotDeliveredMessagesListener', lastMessages)
    }).catch(handleError);

  })

  //get last messages
  socket.on('getLastMessages', newUserId => {
    // console.log(socket)
    if (typeof socket.user === "undefined" || typeof socket.user.userId === "undefined") {
      return false;
    }
    // console.log(newUserId)
    function afterGetAllDatas([user, contacts, chating]) {
      socket.user = user;
      //=> EMIT: online
      // console.log([user, contacts, chating])
      socket.emit('getLastMessagesListener', {
        user,
        contacts,
        chating,
      });
    }
    Promise.all([
      store.getUser(newUserId),
      store.getContats(newUserId),
      store.getLastMessages(newUserId),
    ])
      .then(afterGetAllDatas)
      .catch(handleError);
  })

  // change the currentUser
  socket.on('openChat', (contactId, conversationId) => {
    // console.log('openChat')

    if (typeof socket.user === "undefined" || typeof socket.user.userId === "undefined" || typeof contactId === "undefined" || typeof conversationId === "undefined") {
      return false;
    }

    const sender = socket.user.userId;
    const receiver = contactId;
    // console.log(sender)
    // console.log(receiver)
    Promise.all([
      store.getUserAndUpdate(sender, { currentUserChat: receiver }),
      store.getUser(receiver),
      store.setMessagesToSeen(receiver, sender),
      store.setUserNotificationsToSeen(sender, receiver),
      store.getMessages(conversationId),
    ])
      .then(([senderUser, receiverUser, chat, notification, chating]) => {
        //=> EMIT:messagesSeen
        // console.log('senderUser ' + senderUser.userId)
        // console.log('sender ' + sender)
        // console.log('receiverUser ' + receiverUser._id)
        socket.emit('message', {
          chating
        });
        socket.broadcast.to(receiverUser._id).emit('messagesSeen', sender);
      })
      .catch(handleError);
  });

  socket.on('sendMessage', (receiver, message, conversationId) => {

    if (typeof socket.user === "undefined" || typeof socket.user.userId === "undefined" || typeof receiver === "undefined" || typeof message === "undefined" || typeof conversationId === "undefined") {
      return false;
    }

    // console.log('sendMessage')
    const sender = socket.user.userId;
    //console.log('socket :')
    //console.log(socket.id)
    // console.log('sender : ' + sender)
    // console.log('receiver : ' + receiver)
    store.getUser(receiver).then(receiverUser => {
      const isChatingWithReceiver = (receiverUser.currentUserChat === sender && receiverUser.online);
      const chatMessage = {
        conversationId: conversationId,
        sender: sender,
        receiver: receiver,
        message: message,
        seen: isChatingWithReceiver,
      };
      store.addMessage(chatMessage).then(objMessage => {
        //=> EMIT:receiveMessage
        // socket.emit('receiveMessage', objMessage);
        // console.log('receiverUser')
        socket.broadcast.to(receiverUser.chatId).emit('receiveMessage', objMessage);
        if (!isChatingWithReceiver) {
          store.addUserNotifications(sender, receiver)
            .then(user => {
              //=> EMIT:notSeenMessage
              socket.broadcast.to(receiverUser.id).emit('notSeenMessage', user.notifications);
            }).catch(handleError);
        }
        socket.broadcast.to(receiverUser.chatId).emit('refreshLastMessage', objMessage)
        socket.emit('refreshLastMessage', objMessage)
      }).catch(handleError);
    }).catch(handleError);
  });

  socket.on('userTyping', receiver => {
    // console.log('userTyping')

    if (typeof socket.user === "undefined" || socket.user.userId === "undefined" || typeof receiver === "undefined") {
      return false;
    }

    const sender = socket.user.userId;
    // console.log(sender)
    // console.log(receiver)
    store.getUser(receiver)
      .then(receiverUser => {
        const isChatingWithReceiver = receiverUser.currentUserChat === sender;
        if (isChatingWithReceiver) {
          socket.broadcast.to(receiverUser.id).emit('userTyping', sender);
        }
      })
      .catch(handleError);
  });
  //---------------------------------------------------------------------------------

});


// Starta porta
server.listen(port, function () {
  console.log('Listening on port %s', port);
}); 
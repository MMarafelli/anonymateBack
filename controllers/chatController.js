const mongoose = require('mongoose');
const handleError = require('./handleError');

const User = mongoose.model('User');
const Conversation = mongoose.model("Conversation");

'use strict'

const Conversation1 = {
  members: [{
    member1: 'MMarafelli',
    member2: 'Lilinda'
  }],
  messages: [{
    sender: 'Lilinda',
    receiver: 'MMarafelli',
    message: 'MMarafelli lindo demais'
  },
  {
    sender: 'MMarafelli',
    receiver: 'Lilinda',
    message: 'Lilinda linda demais'
  }]
}

const Conversation2 = {
  members: [{
    member1: 'MMarafelli',
    member2: 'Biel'
  }],
  messages: [{
    sender: 'Biel',
    receiver: 'MMarafelli',
    message: 'Cria vergonha'
  },
  {
    sender: 'MMarafelli',
    receiver: 'Biel',
    message: 'Cria vergonha'
  }]
}

// Conversation.create(Conversation1)
// Conversation.create(Conversation2)

function setUsersToOffLine(ids) {
  console.log('setUsersToOffLine')
  // console.log(ids)
  const query = {
    chatId: { $nin: ids }
  };
  const update = {
    $set: { online: false, chatId: '' }
  };
  return User.update(query, update, { multi: true }).exec();
}

async function getUserAndUpdate(newUserId, fields) {
  console.log('getUserAndUpdate')
  // console.log(newUserId, fields)
  const response = await User.findOne({ _id: newUserId })
    .then(user => {
      Object.keys(fields).forEach(key => {
        user[key] = fields[key]
      });
      return user.save();
    })
    .catch(handleError);

  return ({
    userId: response._id,
    name: response.name,
    username: response.username,
    contacts: response.contacts
  })
}

async function getUser(userId) {
  //console.log('---------i------------')
  // console.log(userId)
  const response = await User.findOne({ _id: userId }).lean().exec();
  // console.log(response)
  //console.log('---------f------------')
  return ({
    userId: response._id,
    name: response.name,
    username: response.username,
    contacts: response.contacts
  })

}

function getUsers() {
  return User.find({}).sort({ online: -1, username: 1 }).lean().exec();
}

async function getContats(newUserId) {
  // console.log('getContats')
  // console.log(newUserId)
  const query = {
    _id: newUserId
  };

  const contacts = await User.findOne(query).lean().exec();
  const fields = { _id: 1, username: 1, name: 1, description: 1, online: 1 };
  const contactsUsernameArray = await contacts.contacts.map(({ contactUserName }) => contactUserName)
  const contactsStuffs = await User.find({ username: { $in: contactsUsernameArray } }, fields)
  // console.log(contacts)
  // console.log(contactsStuffs)
  return contactsStuffs
}

async function getMessages(conversationId) {
  // console.log('getMessages')
  // console.log('conversationId ' + conversationId)

  const response = await Conversation.find({ _id: conversationId }).sort({ "messages.messageAddAt": -1 }).exec();

  // console.log(response)

  return response
}

async function getLastMessagesNotDelivered(userId) {
  console.log('getLastMessagesNotDelivered')
  // console.log('userId: ' + userId)
  const query = {
    $and: [
      {
        $or: [{ "members.member1": userId }, { "members.member2": userId }]
      },
      {
        delivered: false
      }
    ]
  };
  // console.log(query)
  const response = await Conversation.find(query, { messages: { $slice: -1 } }).sort({ "messages.messageAddAt": -1 }).exec();
  // console.log('response: ' + response)

  return response
}

async function getLastMessages(newUserId) {
  console.log('getLastMessages')
  // console.log('newUserId: ' + newUserId)
  const query = {
    $and: [
      {
        $or: [{ "members.member1": newUserId }, { "members.member2": newUserId }]
      },
      {
        delivered: true
      }
    ]
  };
  // console.log(query)
  const response = await Conversation.find(query, { messages: { $slice: -1 } }).sort({ "messages.messageAddAt": -1 }).exec();
  // console.log('response: ' + response)

  return response
}


function setUserNotificationsToSeen(sender, receiver) {
  const query = {
    _id: sender,
    'notifications.username': receiver,
  };
  const update = {
    $set: { "notifications.$.notSeen": 0 },
  };
  return User.update(query, update).exec();
}

function setMessagesToSeen(sender, receiver) {
  console.log('setMessagesToSeen')
  // console.log('sender : ' + sender)
  // console.log('receiver : ' + receiver)
  return Conversation.update({
    from: sender,
    to: receiver
  },
    {
      $set: { seen: true }
    },
    {
      multi: true
    }).exec();
}

async function createConversation(userId, conversation) {
  console.log('createConversation')
  // console.log(userId)
  // console.log(conversation)

  newConversation = {
    members: [{
      member1: userId,
    }],
    messages: [{
      sender: userId,
      message: conversation
    }]
  }

  const response = await Conversation.create(newConversation)
  // console.log(response)
  return response

}

async function addMessage(conversation) {
  console.log('addMessage')

  senderAux = (conversation.sender).toString()
  receiverAux = (conversation.receiver).toString()

  const response = await Conversation.update(
    { _id: conversation.conversationId },
    {
      $push: {
        messages: {
          sender: senderAux,
          receiver: receiverAux,
          message: conversation.message
        }
      }
    }
  )
  if (response.ok = 1) {
    const responseChat = await Conversation.find({ _id: conversation.conversationId }, { messages: { $slice: -1 } }).sort({ "messages.messageAddAt": -1 }).exec();
    // console.log('responseChat: ' + responseChat)
    return responseChat;
  } else {
    return response
  }
}

function addUserNotifications(sender, receiverId) {
  console.log('addUserNotifications')
  // console.log(sender)
  // console.log(receiverId)
  return User.findOne({ _id: receiverId })
    .then(user => {
      const notifications = user.notifications.filter(n => n.username === sender);
      if (notifications.length) {
        user.notifications = user.notifications
          .map(n => {
            if (n.username === sender) {
              n.notSeen += 1;
            }
            return n;
          });
      } else {
        user.notifications.push({
          username: sender,
          notSeen: 1,
          lastSeen: null,
        });
      }
      return user.save();
    })
    .catch(handleError);
}

module.exports = {
  setUsersToOffLine,
  getUserAndUpdate,
  getUser,
  getUsers,
  getContats,
  getMessages,
  getLastMessages,
  setMessagesToSeen,
  setUserNotificationsToSeen,
  addMessage,
  addUserNotifications,
  createConversation,
  getLastMessagesNotDelivered,
};
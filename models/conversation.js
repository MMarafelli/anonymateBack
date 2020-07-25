const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    members: [{
        member1: {
            type: String, default: '',
            trim: true
        },
        member2: {
            type: String, default: '',
            trim: true
        }
    }],
    delivered: {
        type: Boolean,
        default: false,
    },
    messages: [{
        sender: {
            type: String, default: '',
            trim: true
        },
        receiver: {
            type: String, default: '',
            trim: true
        },
        message: {
            type: String
        },
        seen:
        {
            type: Boolean,
            default: false
        },
        messageAddAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

mongoose.model("Conversation", ConversationSchema);
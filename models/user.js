const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true
  },
  username: {
    type: String,
    require: true,
    unique: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true
  },
  picture: {
    type: String,
    default: ''
  },
  password: {
    type: String
  },
  description: {
    type: String, default: '',
    trim: true
  },
  interests: [],
  languageSponkenList: [],
  online: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  chatId: {
    type: String,
    default: ''
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  contacts: [{
    contactUserName: {
      type: String
    },
    contactId: {
      type: String
    },
    addAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentUserChat: {
    type: String,
    default: ''
  },
  notifications: [
    {
      username: { type: String, trim: true },
      notSeen: { type: Number, default: 0 },
    },
  ],
});

UserSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) next();

  this.password = await bcrypt.hash(this.password, 8);
});

UserSchema.methods = {
  compareHash(hash) {
    return bcrypt.compare(hash, this.password);
  },

  generateToken() {
    return jwt.sign({ id: this.id }, "secret", {
      expiresIn: 86400
    });
  }
};

mongoose.model("User", UserSchema);

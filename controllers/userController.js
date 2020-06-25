const router = require("express").Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middlewares/auth");
const fs = require('fs')
const path = require('path')

const User = mongoose.model("User");

const UserBaser1 = {
  name: 'Matheus Marafelli',
  username: 'MMarafelli',
  email: 'mmarafelli@outlook.com',
  picture: 'a',
  password: '123456',
  online: false,
  contacts: [
    { contactUserName: 'Val' },
    { contactUserName: 'Sid' },
    {
      contactUserName: 'Lilinda',
      contactId: '5e82a2f120acae5558d917f5'
    },
    { contactUserName: 'Biel' },
  ]
}

const UserBaser2 = {
  name: 'Lizandra Vasconcellos',
  username: 'Lilinda',
  email: 'liliz@outlook.com',
  picture: 'a',
  password: '123456',
  online: false,
  contacts: [
    { contactUserName: 'Val' },
    { contactUserName: 'Sid' },
    {
      contactUserName: 'MMarafelli',
      contactId: '5e82a2f120acae5558d917f0'
    },
    { contactUserName: 'Biel' },
  ]
}

const UserBaser3 = {
  name: 'Gabriel Henrique',
  username: 'Biel',
  email: 'biel@outlook.com',
  picture: 'a',
  password: '123456',
  online: false,
  contacts: [
    { contactUserName: 'Val' },
    { contactUserName: 'Sid' },
    {
      contactUserName: 'MMarafelli',
      contactId: '5e82a2f120acae5558d917f0'
    },
    { contactUserName: 'Lilinda' },
  ]
}

//  User.create(UserBaser1)
//  User.create(UserBaser2)
//  User.create(UserBaser3)

router.post("/register", async (req, res) => {
  const { email, username } = req.body;

  console.log(req.body)

  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: "Email already exists" });
    }

    if (await User.findOne({ username })) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const user = await User.create(req.body);

    return res.json({
      name: user.name,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      token: user.generateToken()
    });
  } catch (err) {
    return res.status(400).json({ error: "User registration failed" });
  }
});

router.post("/authenticate", async (req, res) => {
  
  console.log("tentativa de login")
  console.log(new Date())
  console.log(req.body)


  try {
    console.log(req.body)
    const { email, password, lastLogin } = req.body;

    console.log(email)
    console.log(password)
    console.log(lastLogin)

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!(await user.compareHash(password))) {
      return res.status(400).json({ error: "Invalid password" });
    }

    user.lastLogin = lastLogin;

    await user.save();

    console.log(new Date())
    console.log("tentativa de login fim")


    return res.json({
      userId: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      contacts: [],
      lastLogin: user.lastLogin,
      token: user.generateToken()
    });
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: "User authentication failed" });
  }
});

router.use(authMiddleware);
router.get("/me", async (req, res) => {
  try {
    const { userId } = req;

    const user = await User.findById(userId);

    return res.json({
      name: user.name,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    });
  } catch (err) {
    return res.status(400).json({ error: "Can't get user information" });
  }
});

router.use(authMiddleware);
router.post("/interestsUpdate", async (req, res) => {

  const { userId, interests, languageSponkenList } = req.body

  // console.log(userId)
  // console.log(interests)
  // console.log(languageSponkenList)

  try {
    const user = await User.findById(userId);
    user.interests = interests
    user.languageSponkenList = languageSponkenList

    await user.save();

    return res.json({ status: 200 })
  } catch {
    return res.status(400).json({ error: "Can't update interests" });
  }

})


router.use(authMiddleware);
router.post("/interests", async (req, res) => {
  console.log(req.body)
  try {
    const user = await User.findOne({ _id: req.body.userId })
    return res.json({
      interests: user.interests,
      languageSponkenList: user.languageSponkenList,
    });
  } catch {
    return res.status(400).json({ error: "Can't get interests" });
  }

})

router.post("/getContacts", async (req, res) => {
  // console.log('entrou pega contatos')
  const { userId } = req;
  try {

    const user = await User.findById(userId);
    const resultUser = await getContactProps(user);
    // console.log('voltou')
    // console.log(resultUser)

    return res.json({
      userId: user._id,
      contacts: resultUser,
    });
  } catch (err) {
    return res.status(400).json({ error: "Can't get user information" });
  }
});

async function getContactProps(user) {
  // console.log('getContactProps')
  const profileImageDefault = './pictures/default.jpeg'
  let setDefaultPic = false
  let response = await Promise.all(user.contacts.map(async (item) => {
    try {
      item = Object.assign(item.toObject(), { picture: 'a' });
      // console.log(item)
      const userAux = await User.findOne({ username: item.contactUserName });

      if (userAux == null) {
        setDefaultPic = true
      }

      if (!setDefaultPic) {
        try {
          const data = fs.readFileSync(user.picture)
          item.picture = Buffer.from(data).toString('base64')
        } catch (err) {
          // console.log('primeiro erro')
          setDefaultPic = true;
        }
      }

      if (setDefaultPic) {
        try {
          const data = fs.readFileSync(profileImageDefault)
          // console.log('achou default')
          item.picture = Buffer.from(data).toString('base64')
          setDefaultPic = false;
        } catch (err) {
          // console.log('default erro')
          // console.log(err)
          next(err)
        }
      }
      return item
    } catch (err) {
      console.log('erro achar contato : ' + err)
    }
  }))
  return response
};

module.exports = router;

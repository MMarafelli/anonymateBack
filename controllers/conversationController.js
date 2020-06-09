const mongoose = require("mongoose");
const router = require("express").Router();
const authMiddleware = require("../middlewares/auth");

const Conversation = mongoose.model("Conversation");

//  route of index
router.get('/conversations', async (req, res) => {
    try {
        const conversations = await Conversation.find();
        return res.json(conversations);
    } catch (err) {
        return res.status(400).json({ error: "Can't get conversations information " + err });
    }
});

//  route of the one conversation
router.use(authMiddleware);
router.post('/users/:receiver/conversation', async (req, res) => {
    console.log('route of the one conversation')
    try {
        console.log(req.headers)
        console.log(req.params)
        const { logged_user } = req.headers;
        const { receiver: user } = req.params;

        const conversation = await Conversation.find({
            $or: [
                {
                    $and: [{ sender: logged_user }, { receiver: user }]
                },
                {
                    $and: [{ sender: user }, { receiver: logged_user }]
                }
            ]
        });

        //console.log(req.connectedUsers);

        // Recupera a última mensagem enviada
        const lastMessage = conversation[conversation.length - 1];

        const data = [];

        data.push(conversation, lastMessage)

        return res.json(data);
    } catch (err) {
        return res.status(400).json({ error: "Can't get last conversations information " + err });
    }
});

//  route of the all conversations
router.use(authMiddleware);
router.get('/users/:receiver/conversations', async (req, res) => {
    console.log('route of the all conversations')
    try {
        // id of user logged
        console.log(req.headers)
        console.log(req.params)
        const { logged_user } = req.headers;
        const { receiver } = req.params;
        const { message } = req.body;

        const conversation = await Conversation.create({
            sender: logged_user,
            receiver,
            message
        });

        const targetSocket = req.connectedUsers[receiver];

        if (targetSocket) {
            req.io
                .to(targetSocket)
                .to(req.connectedUsers[logged_user])
                .emit('message', JSON.stringify(conversation));

            // req.io
            // 	.to(req.connectedUsers[logged_user])
            // 	.emit('last_seen', JSON.stringify(last_seen));
        }

        return res.json(conversation);
    } catch (err) {
        console.log('erro all conversations')
        console.log(err)
        return res.status(400).json({ error: "Can't get last conversations information " + err });
    }
});

module.exports = router;
const Msg = require('../models/msgModel.js');
const express = require('express');
const Cryptr = require('cryptr');

require('dotenv').config({ path: './dev.env' }); // Env. var. file

const router = express.Router();
const cryptr = new Cryptr(process.env.CRYPTR_SECRET);

router.post('/msg', async(req, res, next) => { // To store the message sent into database
    console.log('Received POST request on /msg');
    try {
        const msgData = req.body;

        // Running some validations
        if (msgData.from === msgData.to){
            res.send({error : "User can't msg himself"})
        }

        msgData.content = cryptr.encrypt(msgData.content);

        const msg = new Msg(msgData);
        await msg.save();

        res.send(msg);
    } catch (err) {
        next(err);
    }
})

router.post('/chatmsgs', async(req, res, next) => { // To get all the messages between two users in the chat
    console.log('Received POST request on /chatmsgs');
    try {
        const users = [req.body.from, req.body.to];
        const msgs = await Msg.find({ from: users, to: users }, [], {'createdAt': -1});

        // Removing unnecessary information
        msgs.forEach(m => {
            m.__v = undefined;
            m.content = cryptr.decrypt(m.content);
        })

        res.send(msgs);
    } catch (err) {
        next(err);
    }
})

router.delete('/chatmsg/:id', async(req, res, next) => { // To delete a message by it's _id
    console.log('Received DELETE request on /chatmsg/:id');
    try {
        const msg = await Msg.findById(req.params.id);

        if (!msg) {
            return res.status(404).send({ error: 'No such message found!' });
        }
        await msg.remove();

        res.send({ msg: "Message removed!" });
    } catch (err) {
        next(err);
    }
})

module.exports = router;
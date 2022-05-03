const User = require('../models/userModel');
const Msg = require('../models/msgModel');
const express = require('express');
const validator = require('validator');
const bcrypt = require('bcrypt');
const Cryptr = require('Cryptr');

require('dotenv').config({ path: './dev.env' }); // Env. var. file

const router = express.Router(); // Initializing router to handle user specific requests
const cryptr = new Cryptr(process.env.CRYPTR_SECRET);

router.get('/contacts/:uid', async(req, res, next) => { // For getting all the contacts present
    try {
        // For getting the details of the users in the contact list of a user
        const userUid = req.params.uid;
        let user = await User.findOne({ uid: userUid });
        let contactDetails = await User.find({ uid: user.contacts })
            .select(['firstname', 'lastname', 'uid', 'isProfileImageSet', 'profileImage']);

        contactDetails = contactDetails.map(c => {
            let temp = {...c }._doc;
            temp._id = undefined;
            return temp;
        });

        // Getting latest messages sent by users
        let details = [];

        for (let i = 0; i < contactDetails.length; i++) {
            let c = contactDetails[i];
            const msg = await Msg.findOne({ from: user.uid, to: c.uid }, [], { sort: { 'createdAt': -1 } });
            if (msg) {
                const msgDetails = {...msg }._doc;
                msgDetails.content = cryptr.decrypt(msgDetails.content);

                msgDetails._id = undefined;
                msgDetails.__v = undefined;
                msgDetails.updatedAt = undefined;
                msgDetails.from = undefined;
                msgDetails.to = undefined;

                const date = new Date(msgDetails.createdAt);
                msgDetails.time = date.toLocaleString();
                msgDetails.createdAt = undefined;

                c.latest_msg = {...msgDetails };
            } else {
                c.latest_msg = { content: "", time: "" };
            }
            details.push(c);
        };

        res.send(details);
    } catch (err) {
        next(err);
    }
})

router.post('/register', async(req, res, next) => { // For registering a new user to database
    // const newUser = new User({
    //     firstname: 'Aniket',
    //     lastname: 'Kumar',
    //     age: 20,
    //     email: 'aniket121@gmail.com',
    //     username: 'aniket121',
    //     password: 'qwerty',
    //     uid: 'abcd',
    //     contacts: ['abcd1', 'abcd3']
    // })
    // await newUser.save();
    // res.send(newUser);
    try {
        const userData = req.body;
        userData.uid = "abcd4";
        userData.contacts = [];

        // Running some validations
        if (!validator.isEmail(userData.email)) {
            return res.status(400).send({ error: "Invalid email!" });
        } else if (userData.password.length <= 5) {
            return res.status(400).send({ error: "Password should be greater than 5 characters" });
        } else if (userData.age && (userData.age <= 0 || userData.age > 200)) {
            return res.status(400).send({ error: "Invalid age!" })
        }

        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            return res.status(400).send({ error: "User with this email already exists!" });
        }

        // Hashing the password before storing into DB
        userData.password = await bcrypt.hash(userData.password, 8);

        const newUser = new User(userData);
        await newUser.save();

        // Cleaning up unncessary data
        userData.username = undefined;
        userData.password = undefined;

        // Sending filtered data back to client side
        res.send(userData);
    } catch (err) {
        next(err);
    }
})

router.post('/login', async(req, res, next) => { // To login a user 
    try {
        const userCredentials = req.body;
        const user = await User.findOne({ username: userCredentials.username });

        if (!user) {
            return res.status(404).send({ error: "No user found with these credentials!" });
        }

        // Checking if the password is correct or not
        const isMatch = await bcrypt.compare(userCredentials.password, user.password);
        if (!(isMatch)) {
            return res.status(404).send({ error: "No user found with these credentials!" });
        }

        // Removing unnecessary information
        const temp = ['__v', 'username', 'email', 'password', 'age'];
        temp.forEach(item => user[item] = undefined);

        res.send(user);
    } catch (err) {
        next(err);
    }
})

router.post('/addcontact', async(req, res, next) => { // Add a new contact to the contact list
    try {
        const userUid = req.body.uid;
        const newContactUid = req.body.contact_uid;

        if (userUid === newContactUid) {
            return res.status(400).send({ error: "Conatct uid same as current user's uid" });
        }

        const newUser = await User.findOne({ uid: newContactUid });
        if (!newUser) {
            return res.status(404).send({ error: "No such user exists!" });
        }

        const user = await User.findOne({ uid: userUid });
        const alreadyPresent = user.contacts.filter(c => c === newContactUid);

        if (alreadyPresent && alreadyPresent.length > 0) {
            return res.send({ error: "User already present in contacts list" });
        } else {
            user.contacts.push(newContactUid);
        }
        await user.save();

        res.send(user);
    } catch (err) {
        next(err);
    }
})

router.get('/profile/:uid', async(req, res, next) => { // Getting profile information of any user
    try {
        const user = await User.findOne({ uid: req.params.uid })
            .select(['firstname', 'lastname', 'age', 'email', 'username', 'uid', 'isProfileImageSet', 'profileImage', 'contacts']);

        if (!user) {
            res.status(404).send({ error: "No such user exists!" });
        }

        const userDetails = {...user }._doc;

        // No. of people user has chatted with
        userDetails.total_chats = userDetails.contacts.length;
        userDetails.contacts = undefined;
        userDetails._id = undefined;

        res.send(userDetails);
    } catch (err) {
        next(err);
    }
})

router.post('/profile', async(req, res, next) => { // Updating profile information
    try {
        const user = await User.findOneAndUpdate({ uid: req.body.uid }, req.body);

        if (!user) {
            return res.status(404).send({ error: "No such user exists!" });
        }

        res.send(user);
    } catch (err) {
        next(err);
    }
})

module.exports = router;
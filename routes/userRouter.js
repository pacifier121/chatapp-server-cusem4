const User = require('../models/userModel');
const Msg = require('../models/msgModel');
const express = require('express');
const validator = require('validator');
const bcrypt = require('bcrypt');
const Cryptr = require('Cryptr');

require('dotenv').config({ path: './dev.env' }); // Env. var. file

const router = express.Router(); // Initializing router to handle user specific requests
const cryptr = new Cryptr(process.env.CRYPTR_SECRET);

router.get('/contacts/:username', async(req, res, next) => { // For getting all the contacts present
    console.log('Received GET request on /contacts/:username')
    try {
        // For getting the details of the users in the contact list of a user
        const username = req.params.username;
        let user = await User.findOne({ username });
        let contactDetails = await User.find({ username: user.contacts })
            .select(['name', 'isProfileImageSet', 'profileImage']);

        contactDetails = contactDetails.map(c => {
            let temp = {...c }._doc;
            temp._id = undefined;
            return temp;
        });

        // Getting latest messages sent by users
        let details = [];

        for (let i = 0; i < contactDetails.length; i++) {
            let c = contactDetails[i];
            const msg = await Msg.findOne({ from: user.username, to: c.username }, [], { sort: { 'createdAt': -1 } });
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
    console.log('Received POST request on /register')
    try {
        const userData = req.body;
        userData.contacts = [];

        // Running some validations
        if (!validator.isEmail(userData.email)) {
            return res.send({ error: "Invalid email!" });
        } else if (userData.password.length <= 5) {
            return res.send({ error: "Password should be greater than 5 characters" });
        } 

        let existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            return res.send({ error: "User with this email already exists!" });
        }
        
        existingUser = await User.findOne({username : userData.username});
        if (existingUser) {
            return res.send({ error: "User with this username already exists!" });
        }

        // Hashing the password before storing into DB
        userData.password = await bcrypt.hash(userData.password, 8);

        const newUser = new User(userData);
        await newUser.save();

        // Cleaning up unncessary data
        userData.password = undefined;

        // Sending filtered data back to client side
        res.send(userData);
    } catch (err) {
        next(err);
    }
})

router.post('/login', async(req, res, next) => { // To login a user 
    console.log('Received POST request on /login');
    try {
        const userCredentials = req.body;
        // console.log(userCredentials);

        const user = await User.findOne({ username: userCredentials.username });

        if (!user) {
            return res.send({ error: "No user found with these credentials!" });
        }

        // Checking if the password is correct or not
        const isMatch = await bcrypt.compare(userCredentials.password, user.password);
        if (!(isMatch)) {
            return res.send({ error: "No user found with these credentials!" });
        }

        // Removing unnecessary information
        const temp = ['__v', 'username', 'email', 'password'];
        temp.forEach(item => user[item] = undefined);

        res.send(user);
        // res.send(userCredentials);
    } catch (err) {
        next(err);
    }
})

router.post('/addcontact', async(req, res, next) => { // Add a new contact to the contact list
    console.log('Received POST request on /addcontact');
    try {
        const username = req.body.username;
        const newContactUsername = req.body.contact_username;

        if (username === newContactUsername) {
            return res.send({ error: "Conatct username same as current user's username" });
        }

        const newUser = await User.findOne({ username : newContactUsername });
        if (!newUser) {
            return res.send({ error: "No such user exists!" });
        }

        const user = await User.findOne({ username });
        const alreadyPresent = user.contacts.filter(c => c === newContactUsername);

        if (alreadyPresent && alreadyPresent.length > 0) {
            return res.send({ error: "User already present in contacts list" });
        } else {
            user.contacts.push(newContactUsername);
        }
        await user.save();


        res.send({msg : "Contact added successfully!"});
    } catch (err) {
        next(err);
    }
})

router.get('/profile/:username', async(req, res, next) => { // Getting profile information of any user
    console.log('Received GET request on /profile/:username');
    try {
        const user = await User.findOne({ uid: req.params.uid })
            .select(['name', 'email', 'username', 'isProfileImageSet', 'profileImage', 'contacts']);

        if (!user) {
            res.send({ error: "No such user exists!" });
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
    console.log('Received POST request on /profile');
    try {
        const user = await User.findOneAndUpdate({ username: req.body.username }, req.body);

        if (!user) {
            return res.send({ error: "No such user exists!" });
        }

        res.send(user);
    } catch (err) {
        next(err);
    }
})

module.exports = router;
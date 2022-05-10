const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        max: 40
    },
    age: {
        type: Number,
        min: 1,
        max: 200,
        default: 18,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        max: 50
    },
    username: {
        type: String,
        required: true,
        unique: true,
        min: 5
    },
    password: {
        type: String,
        required: true,
        min: 6 // Min. 6 character long password
    },
    uid: {
        type: String,
        unique: true,
        required: true,
    },
    isProfileImageSet: {
        type: Boolean,
        default: false,
    },
    profileImage: {
        type: String,
        default: "",
    },
    contacts: []
})

const User = mongoose.model('user', userSchema);

module.exports = User;
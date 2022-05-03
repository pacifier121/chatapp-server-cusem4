const mongoose = require('mongoose');

const msgSchema = mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    content: {
        type: String,
    }
}, {
    timestamps: true
})

const Msg = mongoose.model('msg', msgSchema);

module.exports = Msg;
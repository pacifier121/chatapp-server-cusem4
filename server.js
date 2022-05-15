const express = require('express');
const cors = require('cors'); // For bypassing CORS policy
const mongoose = require('mongoose');
const userRouter = require('./routes/userRouter');
const msgRouter = require('./routes/msgRouter');

const app = express();
require('dotenv').config({ path: './dev.env' }); // Env. var. file

app.use(express.json());

// Using cors middleware
app.use(cors());

// Registering routers
app.use(userRouter);
app.use(msgRouter);

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(
    () => {
        console.log('Connected to mongoDB database');
    }).catch((err) => {
    console.log('Error! :', err);
})

const express_server = app.listen(process.env.PORT || process.env.LOCALHOST_PORT, () => {
    console.log(`Server up on port ${process.env.PORT || process.env.LOCALHOST_PORT}`);
})

// TEST feature : websockets
// For configuration of websockets

const server = require('socket.io')(express_server, {
    cors: {
        origin: '*',
    }
}); // Giving express server to socket.io

// A global clients array
let all_clients = {};

server.on('connection', (client) => {

    client.on('new-user-joined', username => {
        client.username = username;
        all_clients[username] = client;
        console.log("SOCKET.IO : " + username + " is online now");
        // server.emit('user-online', client.username);
    })
    
    client.on('msg', (msg) => {
        if (msg.to in all_clients.keys()){
            console.log("SOCKET.IO : " + `${msg.from} just sent a msg to ${msg.to} : ${msg.content}`);
            all_clients[msg.to].emit('msg-recieved', msg);
        }
    })

    client.on('disconnect', () => {
        console.log("SOCKET.IO : " + client.username + ' went offline');
        delete all_clients[client.username];
        // server.emit('user-offline', client.username);
    })
})

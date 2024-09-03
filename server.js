const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', socket => {
    socket.on('join', room => {
        socket.join(room);
        socket.to(room).emit('ready');
    });

    socket.on('message', message => {
        socket.broadcast.emit('message', message);
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

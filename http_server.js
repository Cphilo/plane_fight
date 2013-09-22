var express = require('express');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

server.listen(8005);

app.get('/', function(req, res) {
    res.sendfile('templates/index.html');
    //res.send('Hello');
});

io.sockets.on('connection', function(socket) {
    console.log('connected');
    socket.emit('news', {hello:'world'});
    socket.on('my other event', function(data) {
        console.log(data);
    });
});

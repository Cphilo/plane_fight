var express = require('express');
var path = require('path');
var app = express(),
server = require('http').createServer(app),
io = require('socket.io').listen(server);
app.use(express.static(path.join(__dirname, "/public")));

var MongoClient = require('mongodb').MongoClient;
server.listen(8005);


MongoClient.connect("mongodb://localhost:27017/planeFight", function(err, db) {
    if(err) { return console.dir(err); }
	console.log('connect to database.');
	db.collection('socket_users', function(err, collection) {
	    if(err)throw err;
	});
});

app.get('/', function(req, res) {
	res.sendfile(path.join(__dirname, '/public/templates/index.html'));
});

io.sockets.on('connection', function(socket) {
	console.log('connected');
	socket.emit('news', {hello:'world'});
	socket.on('my other event', function(data) {
		console.log(data);
	});
});

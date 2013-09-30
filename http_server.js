var express = require('express');
var path = require('path');
var fs = require('fs');
var format = require('util').format;
var MongoClient = require('mongodb').MongoClient;
var swig  = require('swig');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);
server.listen(8005);
app.use(express.static(path.join(__dirname, "/public")));
app.configure('production', function(){
    var logFile = fs.createWriteStream('planeFight.log', {flags: 'a'});
    app.use(express.logger({stream:logFile}));
});
app.configure('development', function(){
    app.use(express.logger());
});
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/public/templates'));
swig.setDefaults({ cache: false });

var mydb;
MongoClient.connect("mongodb://localhost:27017/planeFight", function(err, db) {
    if(err) { console.log(format('db error:%s', err)); }
    mydb = db;
});
app.get('/', function(req, res) {
    res.render('index');
});
app.get('/join/:roomid/:playerid?', function(req, res) {
    var roomid = req.params.roomid;
    var playerid = req.params.playerid;
    console.log(format('roomid:%s, playerid:%s', playerid, roomid));
    res.render('player', {roomid:roomid, playerid:playerid});
});
var room = io
    .of('/room')
    .on('connection', function (socket) {
        socket.on('createRoom', function(roomid, playerNumber) {
            mydb.collection('rooms').insert({'roomid':roomid, 'players':[], 'playerNumber':playerNumber}, {safe:true}, function(err, records) {
                if(err){ console.log(format('insert error:%s', err)); }
            });
            socket.roomid = roomid;
            socket.emit('addRoom', roomid);
            console.log(format('create room %s.', roomid));
        });
        socket.on('close', function() {
            console.log(format('socket closed.'));
            mydb.collection('rooms').remove({'roomid':socket.roomid});
            socket.destroy();
        });
    });
var player = io
    .of('/player')
    .on('connection', function (socket) {
        socket.on('addPlayer', function(roomid, playerid) {
            socket.playerid = playerid;
        });
    });

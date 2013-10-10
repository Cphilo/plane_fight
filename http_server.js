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
    var msg = '';
    mydb.collection('rooms').find({}).toArray(function(err, rooms) {
        if(err){ msg = format('find err:%s', err); }
        res.render('index', {rooms:rooms, msg:msg});
    });
});

app.get('/:roomid/:playerNumber/create', function(req, res) {
    var roomid = req.params.roomid;
    var playerNumber = req.params.playerNumber;
    mydb.collection('rooms').insert({roomid:roomid, players:[], playerNumber:playerNumber}, {safe:true}, function(err, records) {
        if(err){ console.log(format('insert error:%s', err)); }
    });
    res.render('room', {roomid:roomid, playerNumber:playerNumber, players:[]});
});

app.get('/:roomid/:playerid/join', function(req, res) {
    var roomid = req.params.roomid;
    var playerid = req.params.playerid;
    var msg = '';
    mydb.collection('rooms').findOne({roomid:roomid}, function(err, room) {
        if(err){
            msg = format('fetch room error:%s', err);
            res.render('player', {roomid:roomid, playerid:playerid, players:room.players, msg:msg});
        }
        else {
            mydb.collection('rooms').update({roomid:roomid}, {$push:{players:playerid}}, function(err, room) {
                if(err){ msg = format('update room error:%s', err); }
                console.log('new players:'+room.players);
                res.render('player', {roomid:roomid, playerid:playerid, players:room.players, msg:msg});
            });
        }
    });
});
var roomSocket = io
    .of('/room')
    .on('connection', function (socket) {
        socket.on('createRoom', function(roomid) {
            socket.roomid = roomid;
        });
        /*socket.on('close', function() {
            console.log(format('socket closed.'));
            mydb.collection('rooms').remove({'roomid':socket.roomid});
            socket.destroy();
        });*/
    });
var playerSocket = io
    .of('/player')
    .on('connection', function (socket) {
        socket.on('addPlayer', function(idObj) {
            roomSocket.sockets.forEach(function(s) {
                if(s.roomid == idObj.roomid) {
                    s.emit('updateMsg', {playerid:idObj.playerid});
                }
            });
            socket.idObj = idObj;
        });
    });

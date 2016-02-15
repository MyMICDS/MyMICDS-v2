/**
 * @file Main file of the whole project.
 */

var port = 420;

/* General Libraries */

var bcrypt = require('bcrypt');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var http = require('http');
var https = require('https');
var io = require('socket.io')(server);

/* SSL */

/*
var credentials =
{
    key: fs.readFileSync('sslcert/server.key', 'utf8'),
    cert: fs.readFileSync('sslcert/server.crt', 'utf8'),
};
*/

/* Express */

var express = require('express');
var app = express();
var server = http.Server(app);

/* Make sure you have a config.js initialized */

try {
    var config = require(__dirname + '/libs/config.js');
} catch(e) {
    throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.JS.EXAMPLE***');
}

/* Connect to the MongoDB Database */

var MongoClient = require('mongodb').MongoClient;

// Connect to the db
MongoClient.connect(config.mongodbURI, function(err, db) {
    if(!err) {
        console.log('Successfully connected to the MongoDB databse');
    }
    
    var userdata = db.collection('users');
    userdata.find().toArray(function(err, items) {
        console.log(items);
    });
});

/* Session */

/* 
 * IMPORTANT: Do not use the default MemoryStore session store. It is not designed for a production environment.
 * If you do use the default store then you should pass the same session instance to express and socket app (data are saved in memory).
 * https://www.npmjs.com/package/connect-mongo
 */

var session = require('express-session')({
    secret: config.expressSessionSecret,
    resave: false,
    saveUninitialized: false,
});
io.use(function(socket, next) {
    session(socket.request, socket.request.res, next);
});

// Configure Express Middleware

app.use(session);

app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.set('view engine', 'ejs');

/* Routes */

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

app.get('/username', function(req, res) {
    res.end(req.session.user);
});

require(__dirname + '/routes/login.js')(app);

/* Socket.io */

io.on('connection', function(socket){
    
    socket.emit('username', socket.request.session.user);
    
	console.log('user connected');
	console.log(socket.request.session);
	
	socket.on('changeUsername', function(username) {
		socket.request.session.user = username;
        socket.emit('username', socket.request.session.user);
	});
    
    socket.on('username', function() {
        socket.emit('username', socket.request.session.user);
    });
	
	socket.on('disconnect', function() {
		console.log('user disconnected');
	});
});

server.listen(port, function() {
    console.log('Server listening on *:' + port);
});
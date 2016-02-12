var port = 420;

/* I am a Mon-god */

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

// Connection URL
/*var url = 'mongodb://45.56.70.141';

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    
    db.close();
});*/

/* General Libraries */

var bodyParser = require('body-parser')
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

/* Session */

/* 
 * IMPORTANT: Do not use the default MemoryStore session store. It is not designed for a production environment.
 * If you do use the default store then you should pass the same session instance to express and socket app (data are saved in memory).
 * https://www.npmjs.com/package/connect-mongo
 */

var session = require('express-session')({
    secret: "130416",
    resave: false,
    saveUninitialized: false,
});
io.use(function(socket, next) {
    session(socket.request, socket.request.res, next);
});

// Configure Express Middleware

app.use(session);

app.use( bodyParser.json() );   // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));

app.set('view engine', 'ejs');

/* Custom Libraries */

var login = require(__dirname + '/libs/login.js')(app);

/* Routes */

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

app.get('/username', function(req, res) {
    res.end(req.session.user);
});

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
var http = require('http');
var https = require('https');

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

var io = require('socket.io')(server);

/* Session */

/* 
 * IMPORTANT: Do not use the default MemoryStore session store. It is not designed for a production environment.
 * If you do use the default store then you should pass the same session instance to express and socket app (data are saved in memory).
 * https://www.npmjs.com/package/connect-mongo
 */

var ios = require('socket.io-express-session');
// TODO: Configure express session (https://github.com/expressjs/session#sessionoptions)
var session = require('express-session')({
    secret: "130416",
    resave: false,
    saveUninitialized: false,
});

app.use(session);
io.use(ios(session));

/* General Libraries */
var ejs = require('ejs');

app.set('view engine', 'ejs');

var port = 420;
server.listen(port, function() {
    console.log('Server listening on *:' + port);
});

app.get('/', function(req, res) {
//	console.log(req.session);
//	req.session.user = 'mgira';
    res.sendFile(__dirname + '/html/index.html');
});

app.get('/login', function(req, res) {
	req.session.user = 'mgira';
    res.end('Logged in');
});

io.on('connection', function(socket){
	
	function emitUsername(username) {
		socket.emit('username', username);
	}
	
	emitUsername();
	console.log('user connected');
	console.log(socket.handshake.session);
	
	socket.on('changeUsername', function(username) {
		socket.handshake.session.user = username;
		emitUsername();
	});
	
	socket.on('disconnect', function() {
		console.log('user disconnected');
	});
});
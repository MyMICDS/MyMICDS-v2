/**
 * @file Main file of the whole project.
 */

var port = 420;
var config = require(__dirname + '/libs/requireConfig.js');

/** General Libraries */

var bodyParser = require('body-parser');
var ejs        = require('ejs');
var http       = require('http');
var https      = require('https');
var lunch      = require(__dirname + '/libs/lunch.js');
var mail       = require(__dirname + '/libs/mail.js');
var weather    = require(__dirname + '/libs/weather.js');

/* SSL */

/*
var credentials =
{
    key: fs.readFileSync('sslcert/server.key', 'utf8'),
    cert: fs.readFileSync('sslcert/server.crt', 'utf8'),
};
*/

/**
 * Frameworks
 */

var express = require('express');
var app     = express();
var server  = http.Server(app);
var io      = require('socket.io')(server);

/**
 * Initializes MongoDB driver and connects to database.
 */

/*var MongoClient = require('mongodb').MongoClient;

MongoClient.connect(config.mongodbURI, function(err, db) {
    if(err) {
        console.error('Unable to establish connection to MongoDB. Error: ' + err)
    } else {
        console.log('Successfully connected to the MongoDB database');
        
        var userdata = db.collection('users');
        userdata.find().toArray(function(err, items) {
            console.log(items);
        });
    }
});*/

/**
 * Initialize Express Session
 */

var session = require('express-session')({
    secret            : config.expressSessionSecret,
    resave            : false,
    saveUninitialized : false,
});
io.use(function(socket, next) {
    session(socket.request, socket.request.res, next);
});

/**
 * Express Engine and Body Parser
 */

app.use(session);

app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.set('view engine', 'ejs');

/**
 * Routes
 */

require(__dirname + '/routes/assets.js')(app, express);
require(__dirname + '/routes/login.js')(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

app.get('/lunch', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    lunch.getLunch(function(lunchJSON) {
        res.send(JSON.stringify(lunchJSON, null, 3));
    });
});

app.get('/test', function(req, res) {
	res.sendFile(__dirname + '/html/test.html');
    weather.getWeather(function(weatherJSON) {
        console.log(weatherJSON);
    });
});

/**
 * Socket.io
 */

io.on('connection', function(socket){
    
	console.log('user connected');
	console.log(socket.request.session);
    
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
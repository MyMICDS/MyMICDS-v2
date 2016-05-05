/**
 * @file Main file of the whole project.
 */

var config = require(__dirname + '/libs/requireConfig.js');
var port   = process.env.PORT || config.port;

/*
 * General Libraries
 */

var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var cookies      = require(__dirname + '/libs/cookies.js');
var ejs          = require('ejs');
var http         = require('http');
var https        = require('https');
var lunch        = require(__dirname + '/libs/lunch.js');
var mail         = require(__dirname + '/libs/mail.js');
var request      = require('request');
var weather      = require(__dirname + '/libs/weather.js');

/*
 * Frameworks
 */

var express = require('express');
var app     = express();
var server  = http.Server(app);
var io      = require('socket.io')(server);

/**
 * Express Middleware
 */

// Cookies
app.use(cookieParser());

// Sessions
var session = require('express-session')({
    secret           : config.expressSessionSecret,
    resave           : false,
    saveUninitialized: false,
});

app.use(session);

io.use(function(socket, next) {
    session(socket.request, socket.request.res, next);
});

// 'Remember Me' Functionality
app.use(cookies.remember);

// Body Parser for POST Variables
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

// EJS as Default Render Engine
app.set('view engine', 'ejs');

/*
 * Routes
 */

require(__dirname + '/routes/assets.js')(app, express);
require(__dirname + '/routes/login.js')(app);
require(__dirname + '/routes/scheduleConfig.js')(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

app.get('/classes', function(req, res) {
    res.sendFile(__dirname + '/html/classes.html');
});

app.get('/lunch', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    lunch.getLunch(function(lunchJSON) {
        res.send(JSON.stringify(lunchJSON, null, 3));
    });
});

app.get('/start', function(req, res) {
	res.sendFile(__dirname + '/html/start.html');
});

var portal = require(__dirname + '/libs/portal.js');

app.get('/feed', function(req, res) {
    portal.scheduleFeed(config.portalTestFeedURL, function(that) {
        res.setHeader('Content-Type', 'text/html');
        var schedule = that.getSchedule();
        res.end(that.success + '<br>' + that.message + '<br><br>' + JSON.stringify(schedule) + '<br><br>');
    });
});

app.get('/test', function(req, res) {
	res.sendFile(__dirname + '/html/test.html');
});

app.get('/iotd', function(req, res) {
	request('http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1', function(error, response, body) {
		if(!error && response.statusCode === 200) {
			var json  = JSON.parse(body);
			var imageURL = 'https://www.bing.com/' + json['images'][0]['url'];
			res.json({ 'image': imageURL });
		} else {
			res.json({ 'image': '/images/backgrounds/middleschool/mac.jpg' });
		}
	});
});

/*
 * Socket.io
 */

io.on('connection', function(socket){
	
    socket.on('username', function() {
        socket.emit('username', socket.request.session.user);
    });
	
	socket.on('disconnect', function() {
//		console.log('user disconnected');
	});
});

server.listen(port, function() {
    console.log('Server listening on *:' + port);
});
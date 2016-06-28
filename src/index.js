/**
 * @file Main file of the whole project.
 */

try {
    var config = require(__dirname + '/libs/config.js');
} catch(e) {
    throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.JS.EXAMPLE***');
}

var port = process.env.PORT || config.port;

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
var sass         = require(__dirname + '/libs/sass.js');

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
app.set('views', __dirname + '/html');
app.set('view engine', 'ejs');

/*
 * Sass Compilation
 */

console.log('Compiling Sass...');
sass.renderDir(__dirname + '/public/css/scss', __dirname + '/public/css');
sass.watchDir(__dirname + '/public/css/scss', __dirname + '/public/css');

/*
 * Routes
 */

require(__dirname + '/routes/assets.js')(app, express);
require(__dirname + '/routes/loginAPI.js')(app);
require(__dirname + '/routes/classAPI.js')(app);
require(__dirname + '/routes/portalAPI.js')(app);

app.get('/', function(req, res) {
    res.render('login', { user: req.session.user });
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

app.get('/portal', function(req, res) {
    res.sendFile(__dirname + '/html/portal.html');
});

app.get('/start', function(req, res) {
	res.sendFile(__dirname + '/html/start.html');
});

var planner = require(__dirname + '/libs/planner.js');
app.get('/planner', function(req, res) {
    planner.eventsForMonth(req.session.user, function(events) {
        res.json(events);
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

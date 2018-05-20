'use strict';

/**
 * @file Main file of the whole project.
 */

let config;
try {
	config = require(__dirname + '/libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const port = process.env.PORT || config.port;

/*
 * General Libraries
 */

const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const jwt = require(__dirname + '/libs/jwt.js');
const MongoClient = require('mongodb').MongoClient;

/*
 * Frameworks
 */

const express = require('express');
const app = express();
const server = http.Server(app);

/**
 * Express Middleware
 */

// Enable Cross-origin Resource Sharing
app.use(cors());

// Body Parser for POST Variables
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));

/*
 * Realtime Stuff
 */

// Socket.io
const io = require('socket.io')(server);
const socketIO = require(__dirname + '/libs/socket.io.js')(io);

// Miscellaneous stuff
// require(__dirname + '/libs/realtime.js')(io, socketIO);

/*
 * Routes
 */

require(__dirname + '/routes/assets.js')(app, express);

// Connect to database
MongoClient.connect(config.mongodb.uri, (err, db) => {
	if(err) throw err;

	// Enable JWT authentication middleware
	app.use(jwt.authorize(db));
	app.use(jwt.fallback);
	app.use(jwt.catchUnauthorized);

	// API Routes
	require(__dirname + '/routes/aliasAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/backgroundAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/bulletinAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/canvasAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/classAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/datesAPI.js')(app);
	require(__dirname + '/routes/feedsAPI.js')(app, db);
	require(__dirname + '/routes/loginAPI.js')(app, db);
	require(__dirname + '/routes/lunchAPI.js')(app, db);
	require(__dirname + '/routes/modulesAPI.js')(app, db);
	require(__dirname + '/routes/notificationsAPI.js')(app, db);
	require(__dirname + '/routes/plannerAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/portalAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/quotesAPI.js')(app, db);
	require(__dirname + '/routes/scheduleAPI.js')(app, db);
	require(__dirname + '/routes/snowdayAPI.js')(app, db);
	require(__dirname + '/routes/sportsAPI.js')(app);
	require(__dirname + '/routes/statsAPI.js')(app, db);
	require(__dirname + '/routes/suggestionAPI.js')(app, db);
	require(__dirname + '/routes/teacherAPI.js')(app, db);
	require(__dirname + '/routes/userAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/weatherAPI.js')(app, db, socketIO);
	require(__dirname + '/routes/stickynotesAPI.js')(app, db);
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/html/admin.html');
});

app.get('/start', (req, res) => {
	res.sendFile(__dirname + '/html/start.html');
});

app.get('/socket-io-test', (req, res) => {
	res.sendFile(__dirname + '/html/socket.html');
});

app.get('/spin', (req, res) => {
	res.sendFile(__dirname + '/html/spin.html');
});

/*
 * Initialize Server
 */

server.listen(port, () => {
	console.log('Server listening on *:' + port);
});

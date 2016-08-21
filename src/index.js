'use strict';

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

var bodyParser  = require('body-parser');
var cors        = require('cors');
var ejs         = require('ejs');
var jwt         = require(__dirname + '/libs/jwt.js');
var lunch       = require(__dirname + '/libs/lunch.js');
var mail        = require(__dirname + '/libs/mail.js');
var MongoClient = require('mongodb').MongoClient;
var request     = require('request');
var weather     = require(__dirname + '/libs/weather.js');

/*
 * Frameworks
 */

var express = require('express');
var app = express();

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
 * EJS as Default Render Engine
 */

app.set('views', __dirname + '/html');
app.set('view engine', 'ejs');

/*
 * Regularly Schedule Tasks (Like Cron-Jobs)
 */

require(__dirname + '/libs/tasks.js')();

/*
 * Routes
 */

require(__dirname + '/routes/assets.js')(app, express);

// Connect to database
MongoClient.connect(config.mongodb.uri, function(err, db) {
	if(err) throw err;

	// Enable JWT authentication middleware
	app.use(jwt.authorize(db));
	app.use(jwt.fallback);
	app.use(jwt.catchUnauthorized);

	// API Routes
	require(__dirname + '/routes/aliasAPI.js')(app, db);
	require(__dirname + '/routes/backgroundAPI.js')(app, db);
	require(__dirname + '/routes/bulletinAPI.js')(app, db);
	require(__dirname + '/routes/canvasAPI.js')(app, db);
	require(__dirname + '/routes/classAPI.js')(app, db);
	require(__dirname + '/routes/loginAPI.js')(app, db);
	require(__dirname + '/routes/lunchAPI.js')(app, db);
	require(__dirname + '/routes/plannerAPI.js')(app, db);
	require(__dirname + '/routes/portalAPI.js')(app, db);
	require(__dirname + '/routes/userAPI.js')(app, db);
	require(__dirname + '/routes/notificationAPI.js')(app, db);
	require(__dirname + '/routes/weatherAPI.js')(app, db);
});

app.get('/start', function(req, res) {
	res.sendFile(__dirname + '/html/start.html');
});

/*
 * Initialize Server
 */

app.listen(port, function() {
	console.log('Server listening on *:' + port);
});

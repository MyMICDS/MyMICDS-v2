import config from './libs/config';
const port = process.env.PORT || config.port;

/*
 * General Libraries
 */

import * as bodyParser from 'body-parser';
import cors from 'cors';
import * as http from 'http';
import { MongoClient } from 'mongodb';
import * as api from './libs/api';
import * as jwt from './libs/jwt';

/*
 * Frameworks
 */

import express from 'express';
const app = express();
const server: http.Server = new http.Server(app);

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
import socketFactory from 'socket.io';
const io = socketFactory(server);

import socketHelper from './libs/socket.io';
const socketIO = socketHelper(io);

// Miscellaneous stuff
// require(__dirname + '/libs/realtime.js')(io, socketIO);

/*
 * Routes
 */

import RoutesFunction from './routes/routesFunction';

import assetsHandler from './routes/assets';
assetsHandler(app, express);

// Connect to database
(MongoClient.connect as (uri: string) => Promise<MongoClient>)(config.mongodb.uri).then(async client => {
	const db = client.db();

	// Enable JWT authentication middleware
	app.use(jwt.authorize(db));
	app.use(jwt.fallback);
	app.use(jwt.catchUnauthorized);

	// Enable admin overrides
	app.use(api.adminOverride);

	// Require all routes
	const routes = await Promise.all<RoutesFunction>([
		'alias',
		'auth',
		'background',
		'canvas',
		'class',
		'dailyBulletin',
		'dates',
		'feeds',
		'lunch',
		'modules',
		'notifications',
		'planner',
		'portal',
		'quotes',
		'schedule',
		'snowday',
		'sports',
		'stats',
		'stickynotes',
		'suggestion',
		'teacher',
		'user',
		'weather'
	].map(r => import(`./routes/${r}API`).then(i => i.default)));

	for (const route of routes) {
		route(app, db, socketIO);
	}
}).catch(err => {
	throw err;
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
	// tslint:disable-next-line:no-console
	console.log('Server listening on *:' + port);
});

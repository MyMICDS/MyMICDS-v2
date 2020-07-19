import * as Sentry from '@sentry/node';
import * as bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import * as http from 'http';
import { MongoClient } from 'mongodb';
import socketFactory from 'socket.io';
import * as api from './libs/api';
import config from './libs/config';
import * as jwt from './libs/jwt';
import socketHelper from './libs/socket.io';
import assetsHandler from './routes/assets';
import RoutesFunction from './routes/routesFunction';

export async function initAPI(dbUri: string) {
	const app = express();
	const server = new http.Server(app);

	// Socket.io setup
	const io = socketFactory(server);
	const socketIO = socketHelper(io);

	// Sentry request tracking
	app.use(Sentry.Handlers.requestHandler({
		user: ['user', 'scopes']
	}));

	// Enable Cross-origin Resource Sharing
	app.use(cors());

	// Body Parser for POST Variables
	app.use(bodyParser.json());     // to support JSON-encoded bodies
	app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
		extended: true
	}));

	// Force error response for testing routes
	app.use((req, res, next) => {
		//  ignore if forceError is null/undefined
		if (config.forceError?.includes(req.originalUrl)) {
			api.error(res, new Error('Forced error response for route'));
			return;
		}

		next();
	});

	// Connect to database
	const client = await MongoClient.connect(dbUri);
	const db = client.db();

	// Enable JWT authentication middleware
	app.use(jwt.authorize(db));

	// Enable admin overrides
	app.use(api.adminOverride);

	assetsHandler(app);

	// Require all routes
	const routes = await Promise.all([
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
	].map(r => import(`./routes/${r}API`).then(i => i.default as RoutesFunction)));

	for (const route of routes) {
		route(app, db, socketIO);
	}

	// Synchronous error handler
	app.use(((err, req, res, next) => {
		if (res.headersSent) {
			return next(err);
		}
		api.error(res, err);
	}) as express.ErrorRequestHandler);

	return [app, db, server] as const;
}

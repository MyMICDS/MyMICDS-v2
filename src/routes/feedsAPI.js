/**
 * @file Manages feeds API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const feeds = require(__dirname + '/../libs/feeds.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db) => {

	app.post('/feeds/canvas-cache', jwt.requireLoggedIn, (req, res) => {
		feeds.updateCanvasCache(db, req.apiUser, err => {
			api.respond(res, err);
		});
	});

	app.post('/feeds/portal-queue', jwt.requireLoggedIn, (req, res) => {
		feeds.addPortalQueue(db, req.apiUser, err => {
			api.respond(res, err);
		});
	});

};

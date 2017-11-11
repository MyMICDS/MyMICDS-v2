/**
 * @file Manages feeds API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const feeds = require(__dirname + '/../libs/feeds.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db) => {

	app.post('/feeds/update-canvas-cache', jwt.requireLoggedIn, (req, res) => {
		feeds.updateCanvasCache(db, req.user.user, err => {
			api.respond(res, err);
		});
	});

	app.post('/feeds/add-portal-queue', jwt.requireLoggedIn, (req, res) => {
		feeds.addPortalQueue(db, req.user.user, err => {
			api.respond(res, err);
		});
	});

};

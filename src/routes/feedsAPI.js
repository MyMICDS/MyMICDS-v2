/**
 * @file Manages feeds API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const feeds = require(__dirname + '/../libs/feeds.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db) => {

	app.post('/feeds/canvas-cache', jwt.requireLoggedIn, async (req, res) => {
		try {
			await feeds.updateCanvasCache(db, req.apiUser);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/feeds/portal-queue', jwt.requireLoggedIn, async (req, res) => {
		try {
			await feeds.addPortalQueue(db, req.apiUser);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};

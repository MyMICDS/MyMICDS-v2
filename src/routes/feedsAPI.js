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

	app.post('/feeds/portal-queue', (req, res) => {
		feeds.addPortalQueueClasses(db, req.apiUser, err => {
			if(err) {
				api.respond(res, err);
				return;
			}

			feeds.addPortalQueueCalendar(db, req.user.user, err => {
				api.respond(res, err);
			});
		});
	});

};

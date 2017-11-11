/**
 * @file Manages Canvas API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const canvas = require(__dirname + '/../libs/canvas.js');
const feeds = require(__dirname + '/../libs/feeds.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db, socketIO) => {
	app.post('/canvas/test-url', (req, res) => {
		canvas.verifyURL(req.body.url, (err, isValid, url) => {
			api.respond(res, err, { valid: isValid, url });
		});
	});

	app.post('/canvas/set-url', jwt.requireLoggedIn, (req, res) => {
		canvas.setURL(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			if(!err) {
				socketIO.user(req.user.user, 'canvas', 'set-url', validURL);
			}
			api.respond(res, err, { valid: isValid, url: validURL });
		});
	});

	app.post('/canvas/get-events', jwt.requireLoggedIn, (req, res) => {
		feeds.canvasCacheRetry(db, req.user.user, (err, hasURL, events) => {
			api.respond(res, err, { hasURL, events });
		});
	});

	app.post('/canvas/get-classes', jwt.requireLoggedIn, (req, res) => {
		canvas.getClasses(db, req.user.user, (err, hasURL, classes) => {
			api.respond(res, err, { hasURL, classes });
		});
	});
};

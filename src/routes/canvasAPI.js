/**
 * @file Manages Canvas API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const canvas = require(__dirname + '/../libs/canvas.js');
const feeds = require(__dirname + '/../libs/feeds.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db, socketIO) => {
	app.post('/canvas/test', (req, res) => {
		canvas.verifyURL(req.body.url, (err, isValid, url) => {
			api.respond(res, err, { valid: isValid, url });
		});
	});

	app.put('/canvas/url', jwt.requireLoggedIn, (req, res) => {
		canvas.setURL(db, req.apiUser, req.body.url, (err, isValid, validURL) => {
			if(!err) {
				socketIO.user(req.apiUser, 'canvas', 'set-url', validURL);
			}
			api.respond(res, err, { valid: isValid, url: validURL });
		});
	});

	app.get('/canvas/events', jwt.requireLoggedIn, (req, res) => {
		feeds.canvasCacheRetry(db, req.apiUser, (err, hasURL, events) => {
			api.respond(res, err, { hasURL, events });
		});
	});

	app.get('/canvas/classes', jwt.requireLoggedIn, (req, res) => {
		canvas.getClasses(db, req.apiUser, (err, hasURL, classes) => {
			api.respond(res, err, { hasURL, classes });
		});
	});
};

'use strict';

/**
 * @file Manages Canvas API endpoints
 */

var canvas = require(__dirname + '/../libs/canvas.js');

module.exports = (app, db, socketIO) => {
	app.post('/canvas/test-url', (req, res) => {
		canvas.verifyURL(req.body.url, (err, isValid, url) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				valid: isValid,
				url  : url
			});
		});
	});

	app.post('/canvas/set-url', (req, res) => {
		canvas.setURL(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
				socketIO.user(req.user.user, 'canvas', 'set-url', validURL);
			}
			res.json({
				error: errorMessage,
				valid: isValid,
				url  : validURL
			});
		});
	});

	app.post('/canvas/get-events', (req, res) => {
		canvas.getEvents(db, req.user.user, (err, hasURL, events) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error : errorMessage,
				hasURL: hasURL,
				events: events
			});
		});
	});

	app.post('/canvas/get-classes', (req, res) => {
		canvas.getClasses(db, req.user.user, (err, hasURL, classes) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				hasURL: hasURL,
				classes: classes
			});
		});
	});
};

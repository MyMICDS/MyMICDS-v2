'use strict';

/**
 * @file Manages Canvas API endpoints
 */
const canvas = require(__dirname + '/../libs/canvas.js');

module.exports = (app, db, socketIO) => {
	app.post('/canvas/test-url', (req, res) => {
		canvas.verifyURL(req.body.url, (err, isValid, url) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
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
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
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
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
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
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}
			res.json({
				error: errorMessage,
				hasURL: hasURL,
				classes: classes
			});
		});
	});
};

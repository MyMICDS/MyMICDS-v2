'use strict';

/**
 * @file Manages Portal API endpoints
 */

var portal = require(__dirname + '/../libs/portal.js');

module.exports = (app, db, socketIO) => {
	app.post('/portal/test-url', (req, res) => {
		portal.verifyURL(req.body.url, (err, isValid, url) => {
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

	app.post('/portal/set-url', (req, res) => {
		portal.setURL(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
				socketIO.user(req.user.user, 'portal', 'set-url', validURL);
			}
			res.json({
				error: errorMessage,
				valid: isValid,
				url  : validURL
			});
		});
	});

	app.post('/portal/get-classes', (req, res) => {
		portal.getClasses(db, req.user.user, (err, hasURL, classes) => {
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

	app.post('/portal/day-rotation', (req, res) => {
		portal.getDayRotations((err, days) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				days: days
			});
		});
	});

}

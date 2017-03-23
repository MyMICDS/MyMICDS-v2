'use strict';

/**
 * @file Manages Portal API endpoints
 */
const portal = require(__dirname + '/../libs/portal.js');

module.exports = (app, db, socketIO) => {
	app.post('/portal/test-url', (req, res) => {
		portal.verifyURL(req.body.url, (err, isValid, url) => {
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

	app.post('/portal/set-url', (req, res) => {
		portal.setURL(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
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

	app.post('/portal/day-rotation', (req, res) => {
		portal.getDayRotations((err, days) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}
			res.json({
				error: errorMessage,
				days: days
			});
		});
	});

};

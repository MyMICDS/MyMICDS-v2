'use strict';

/**
 * @file Manages Canvas API endpoints
 */

var canvas = require(__dirname + '/../libs/canvas.js');

module.exports = function(app, db) {
	app.post('/canvas/test-url', function(req, res) {
		canvas.verifyURL(req.body.url, function(err, isValid, url) {
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

	app.post('/canvas/set-url', function(req, res) {
		canvas.setURL(db, req.user.user, req.body.url, function(err, isValid, validURL) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				valid: isValid,
				url  : validURL
			});
		});
	});

	app.post('/canvas/get-events', function(req, res) {
		var date = {
			year : parseInt(req.body.year),
			month: parseInt(req.body.month)
		};

		canvas.getEvents(db, req.user.user, date, function(err, hasURL, events) {
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
}

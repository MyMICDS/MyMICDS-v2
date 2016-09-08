'use strict';

/**
 * @file Manages schedule API endpoints
 */

var portal = require(__dirname + '/../libs/portal.js');
var prisma = require('prisma');

module.exports = function(app, db, socketIO) {
	app.post('/portal/test-url', function(req, res) {
		portal.verifyURL(req.body.url, function(err, isValid, url) {
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

	app.post('/portal/set-url', function(req, res) {
		portal.setURL(db, req.user.user, req.body.url, function(err, isValid, validURL) {
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

	app.post('/portal/get-schedule', function(req, res) {
		var current = new Date();

		var year = req.body.year || current.getFullYear();
		var month = req.body.month || current.getMonth() + 1;
		var day = req.body.day || current.getDate();

		var date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		portal.getSchedule(db, req.user.user, date, function(err, hasURL, schedule) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error: errorMessage,
				hasURL: hasURL,
				schedule: schedule
			});
		});
	});

	app.post('/portal/get-classes', function(req, res) {
		portal.getClasses(db, req.user.user, function(err, hasURL, classes) {
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

}

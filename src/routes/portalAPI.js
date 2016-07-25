'use strict';

/**
 * @file Manages schedule API endpoints
 */

var portal = require(__dirname + '/../libs/portal.js');

module.exports = function(app, db) {
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
			}
			res.json({
				error: errorMessage,
				valid: isValid,
				url  : validURL
			});
		});
	});

	app.post('/portal/get-schedule', function(req, res) {
		var date = {
			year : parseInt(req.body.year),
			month: parseInt(req.body.month),
			day  : parseInt(req.body.day)
		};

		portal.getSchedule(db, req.user.user, date, function(err, hasURL, schedule) {
			if(!err && hasURL) {
				res.json({
					error: null,
					schedule: schedule
				});
				return;
			}

			// There was an error, default to generic schedule
			portal.getDayRotation(date, function(err, scheduleDay) {
				if(err) {
					res.json({
						error: 'There was a problem fetching your schedule!',
						schedule: null
					});
					return;
				}

				var classes = [];
				// Only add school class if valid day rotation
				if(scheduleDay !== null) {
					var end = new Date(date.year, date.month, date.day, 15, 15);
					// If day is Wednesday, make start date 9 instead of 8
					var start = new Date(date.year, date.month, date.day, end.getDay() === 3 ? 9:8);

					classes.push({
						name : 'School',
						start: start,
						end  : end
					});
				}

				var schedule = {
					day: scheduleDay,
					classes,
					allDay: []
				}

				res.json({
					error: null,
					schedule: schedule
				});

			});
		});
	});

}

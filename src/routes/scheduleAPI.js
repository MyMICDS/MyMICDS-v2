'use strict';

/**
 * @file Manages schedule API endpoints
 */

var schedule = require(__dirname + '/../libs/schedule.js');

module.exports = (app, db) => {
	app.post('/schedule/get', (req, res) => {
		var current = new Date();

		var year = req.body.year || current.getFullYear();
		var month = req.body.month || current.getMonth() + 1;
		var day = req.body.day || current.getDate();

		var date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		schedule.get(db, req.user.user, date, (err, hasURL, schedule) => {
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

}

'use strict';

/**
 * @file Manages lunch API endpoints
 */

var lunch = require(__dirname + '/../libs/lunch.js');

module.exports = function(app, db) {

	app.post('/lunch/get', function(req, res) {

		var current = new Date();

		var year = req.body.year || current.getFullYear();
		var month = req.body.month || current.getMonth() + 1;
		var day = req.body.day || current.getDate();

		var date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		lunch.get(db, date, function(err, lunchJSON) {

			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error: errorMessage,
				lunch: lunchJSON
			});
		});
	});

}

'use strict';

/**
 * @file Manages lunch API endpoints
 */

var lunch = require(__dirname + '/../libs/lunch.js');

module.exports = function(app, db) {

	app.post('/lunch/get', function(req, res) {
		lunch.get({
			year : parseInt(req.body.year),
			month: parseInt(req.body.month),
			day  : parseInt(req.body.day)
		}, function(err, lunchJSON) {
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

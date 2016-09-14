'use strict';

/**
 * @file Manages lunch API endpoints
 */

var lunch = require(__dirname + '/../libs/lunch.js');

module.exports = function(app, db) {

	app.post('/lunch/get', function(req, res) {
		var lunchDate = new Date(parseInt(req.body.year), parseInt(req.body.month - 1), parseInt(req.body.day));
		lunch.get(db, lunchDate, function(err, lunchJSON) {
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

'use strict';

/**
 * @file Manages user API endpoints
 */

var dates = require(__dirname + '/../libs/dates.js');

module.exports = function(app) {

	app.post('/dates/school-ends', function(req, res) {
		res.json({ date: dates.schoolEnds() });
	});

	app.post('/dates/breaks', function(req, res) {
		dates.getBreaks(function(err, breaks) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error: errorMessage,
				breaks: breaks
			});
		});
	});

}

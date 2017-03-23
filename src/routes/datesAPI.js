'use strict';

/**
 * @file Manages user API endpoints
 */

var dates = require(__dirname + '/../libs/dates.js');

module.exports = app => {

	app.post('/dates/school-ends', (req, res) => {
		res.json({ date: dates.schoolEnds() });
	});

	app.post('/dates/breaks', (req, res) => {
		dates.getBreaks((err, breaks) => {
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

};

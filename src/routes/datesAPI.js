'use strict';

/**
 * @file Manages user API endpoints
 */
const dates = require(__dirname + '/../libs/dates.js');

module.exports = app => {

	app.post('/dates/school-ends', (req, res) => {
		res.json({ date: dates.schoolEnds() });
	});

	app.post('/dates/breaks', (req, res) => {
		dates.getBreaks((err, breaks) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}

			res.json({
				error: errorMessage,
				breaks: breaks
			});
		});
	});

};

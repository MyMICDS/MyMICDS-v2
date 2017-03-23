'use strict';

/**
 * @file Manages Snowday Calculator API endpoints
 */
const snowdayCalculator = require(__dirname + '/../libs/snowdayCalculator.js');

module.exports = (app, db) => {

	app.post('/snowday/calculate', (req, res) => {
		snowdayCalculator.calculate(db, (err, data) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}

			res.json({
				error: errorMessage,
				data: data
			});
		});
	});

};

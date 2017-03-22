'use strict';

/**
 * @file Manages Snowday Calculator API endpoints
 */

var snowdayCalculator = require(__dirname + '/../libs/snowdayCalculator.js');

module.exports = (app, db) => {

	app.post('/snowday/calculate', (req, res) => {
		snowdayCalculator.calculate(db, (err, data) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error: errorMessage,
				data: data
			});
		});
	});

}

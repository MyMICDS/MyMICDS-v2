'use strict';

/**
 * @file Manages sports API endpoints
 */
const sports = require(__dirname + '/../libs/sports.js');

module.exports = app => {

	app.post('/sports/scores', (req, res) => {
		sports.scores((err, scores) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}

			res.json({
				error: errorMessage,
				scores: scores
			});
		});
	});

};

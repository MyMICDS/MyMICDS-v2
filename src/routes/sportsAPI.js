'use strict';

/**
 * @file Manages sports API endpoints
 */

var sports = require(__dirname + '/../libs/sports.js');

module.exports = app => {

	app.post('/sports/scores', (req, res) => {
		sports.scores((err, scores) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error: errorMessage,
				scores: scores
			});
		});
	});

}

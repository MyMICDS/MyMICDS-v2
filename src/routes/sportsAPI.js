'use strict';

/**
 * @file Manages sports API endpoints
 */

var sports = require(__dirname + '/../libs/sports.js');

module.exports = function(app) {

	app.post('/sports/scores', function(req, res) {
		sports.scores(function(err, scores) {
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

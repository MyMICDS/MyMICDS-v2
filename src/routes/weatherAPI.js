'use strict';

/**
 * @file Manages weather API endpoints
 */

var weather = require(__dirname + '/../libs/weather.js');

module.exports = function(app, db) {

	app.post('/weather/get', function(req, res) {
		weather.get(function(err, weatherJSON) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				weather: weatherJSON
			});
		});
	});

}

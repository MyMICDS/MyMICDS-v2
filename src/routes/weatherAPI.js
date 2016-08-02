'use strict';

/**
 * @file Manages weather API endpoints
 */

var weather = require(__dirname + '/../libs/weather.js');

module.exports = function(app, db) {

	app.post('/weather/get', function(req, res) {
		weather.getWeather(function(err, weatherJSON) {
			if(err) {
				res.json({error: err.message});
			} else {
				res.json(weatherJSON);
			}
		});
	});

}
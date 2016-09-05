'use strict';

/**
 * @file Gets weather from forecast.io
 * @module weather
 */

var config   = require(__dirname + '/config.js');
var Forecast = require('forecast.io');
var fs       = require('fs-extra');

var JSONPath = __dirname + '/../api/weather.json';

// Coordinates for MICDS
var latitude  = 38.658241;
var longitude = -90.3974471;

// Options for configuring the Forecast object
var options = {
	APIKey: config.forecast.APIKey
}

/**
 * Get's weather from forecast.io and returns JSON
 * @function getWeather
 *
 * @param {getWeatherCallback} callback - Callback
 */

/**
 * Callback after it gets the weather
 * @callback getWeatherCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} weatherJSON - JSON of current weather. Null if error.
 */

 function getWeather(callback) {
	 if(typeof callback !== 'function') return;

	 fs.readJSON(JSONPath, function(err, weatherJSON) {
		 // If there's an error, most likely there's no existing JSON
		 if(err) {
			 updateWeather(callback);
			 return;
		 }

		 callback(null, weatherJSON);
	 });
 }


/**
 * Get's weather from forecast.io and returns JSON
 * @function updateWeather
 *
 * @param {updateWeatherCallback}
 */

/**
 * Callback after it gets the weather
 * @callback updateWeatherCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} weatherJSON - JSON of current weather. Null if error.
 */

function updateWeather(callback) {

	if(typeof callback !== 'function') {
		callback = function() {};
	}

	// Create forecast object to query
	var forecast = new Forecast(options);

	forecast.get(latitude, longitude, function(err, res, data) {
		if(err) {
			callback(new Error('There was a problem fetching the weather data!'), null);
			return;
		}

		fs.outputJSON(JSONPath, data, function(err) {
			if(err) {
				callback(new Error('There was a problem saving the weather data!'), null);
				return;
			}

			callback(null, data);

		});
	});

}

module.exports.get    = getWeather;
module.exports.update = updateWeather;

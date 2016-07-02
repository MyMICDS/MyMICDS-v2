'use strict';

/**
 * @file Gets weather from forecast.io
 * @module weather
 */

var config   = require(__dirname + '/config.js');
var Forecast = require('forecast.io');
var fs       = require('fs-extra');

var JSONPath = __dirname + '/../public/json/weather.json';

// Coordinates for MICDS
var latitude  = 38.658241;
var longitude = -90.3974471;

// Options for configuring the Forecast object
var options = {
	APIKey: config.forecastAPIKey
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

	 // Test to see if JSON path is valid. If not, create one.
	 fs.stat(JSONPath, function(err, stats) {
		 if(err) {
			 callback(new Error('There was a problem retrieving the weather data!'), null);
			 return;
		 }

		 if(stats.isFile()) {
			 // Great! JSONPath is valid!
			 fs.readJSON(JSONPath, function(err, weatherJSON) {
				 if(err) {
					 callback(new Error('There was a problem reading the weather data!'), null);
					 return;
				 }

				 callback(null, weatherJSON);
			 });
		 } else {
			 // If the lunch JSON file does not exist, let's create one
			 updateWeather(null, callback);
		 }
	 });
 }


/**
 * Get's weather from forecast.io and returns JSON
 * @function updateWeather
 *
 * @param {updateWeatherCallback}
 * @param {Object} [io] - socket.io object, to emit a 'weather' event with JSON for clients to update
 */

/**
 * Callback after it gets the weather
 * @callback updateWeatherCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} weatherJSON - JSON of current weather. Null if error.
 */

function updateWeather(callback, io) {

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
				callback(new Error('There was a problem writing the weather data!'), null);
				return;
			}

			// Optionally emit weather event with JSON
			if(typeof io === 'object') {
				io.emit('weather', data);
			}
			callback(null, data);
		});
	});

}

module.exports.getWeather    = getWeather;
module.exports.updateWeather = updateWeather;

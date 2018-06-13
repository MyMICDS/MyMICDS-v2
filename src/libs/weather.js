'use strict';

/**
 * @file Gets weather from forecast.io
 * @module weather
 */
const config = require(__dirname + '/config.js');
const DarkSky = require('forecast.io');
const fs = require('fs-extra');

const JSONPath = __dirname + '/../api/weather.json';

// Coordinates for MICDS
const latitude = 38.658241;
const longitude = -90.3974471;

// Options for configuring the Forecast object
const options = {
	APIKey: config.forecast.APIKey
};

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
function getWeather() {
	return new Promise(resolve => {
		fs.readJSON(JSONPath, (err, weatherJSON) => {
			// If there's an error, most likely there's no existing JSON
			if (err) {
				updateWeather();
				resolve();
				return;
			}

			resolve(weatherJSON);
		});
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
function updateWeather() {
	// Create forecast object to query
	const darksky = new DarkSky(options);

	return new Promise((resolve, reject) => {
		darksky.get(latitude, longitude, (err, res, data) => {
			if (err) {
				reject(new Error('There was a problem fetching the weather data!'));
				return;
			}

			fs.outputJSON(JSONPath, data, { spaces: '\t' }, err => {
				if (err) {
					reject(new Error('There was a problem saving the weather data!'));
					return;
				}

				resolve(data);
			});
		});
	};
}

module.exports.get    = getWeather;
module.exports.update = updateWeather;

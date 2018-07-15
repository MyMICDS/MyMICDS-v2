import { Weather } from '@mymicds/sdk';
import DarkSky from 'forecast.io';
import * as fs from 'fs-extra';
import config from './config';

const JSON_PATH = __dirname + '/../api/weather.json';

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
async function getWeather() {
	let weatherJSON: Weather;
	try {
		weatherJSON = await fs.readJSON(JSON_PATH);
	} catch (e) {
		weatherJSON = await updateWeather();
	}

	return weatherJSON;
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
async function updateWeather() {
	// Create forecast object to query
	const darksky = new DarkSky(options);

	const data = await new Promise<Weather>((resolve, reject) => {
		darksky.get(latitude, longitude, (err: Error, res: any, resData: Weather) => {
			if (err) {
				reject(new Error('There was a problem fetching the weather data!'));
				return;
			}

			resolve(resData);
		});
	});

	try {
		await fs.outputJSON(JSON_PATH, data, { spaces: '\t' });
	} catch (e) {
		throw new Error('There was a problem saving the weather data!');
	}

	return data;
}

export {
	getWeather as get,
	updateWeather as update
};

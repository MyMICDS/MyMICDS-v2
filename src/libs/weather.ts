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
 * Retrieves the weather. Checks the local file cache first, else updates the weather.
 * @returns A weather object.
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
 * Updates the weather from Dark Sky.
 * @returns A weather object.
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

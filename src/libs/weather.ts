import { Weather, OpenWeather, SimplifiedWeather } from '@mymicds/sdk';
import * as fs from 'fs-extra';
import config from './config';
import DarkSky from 'forecast.io';
import axios from 'axios';

export const JSON_PATH = __dirname + '/../api/weather.json';

// Coordinates for MICDS
const latitude = 38.658241;
const longitude = -90.3974471;

// Options for configuring the Forecast object
const options = {
	APIKey: config.forecast.APIKey
};

// endpoint for current weather and couple day's forecast for MICDS, in imperial units, without the by-minute calc
const openWeatherEndpoint = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&appid=${config.openWeather.APIKey}&units=imperial&exclude=minutely`;

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
		darksky.get(latitude, longitude, (err: Error, _: never, resData: Weather) => {
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

// TODO rename when done
async function getOpenWeather() {
	let weatherJSON: Weather;
	try {
		weatherJSON = await fs.readJSON(JSON_PATH);
	} catch (e) {
		weatherJSON = await updateWeather();
	}

	return weatherJSON;
}

async function updateOpenWeather() {
	let rawWeather: OpenWeather;
	let weather: SimplifiedWeather | null = null;

	try {
		// grab dat DATA
		let response = await axios.get(openWeatherEndpoint);
		rawWeather = response.data;
		// convert dat DATA
		weather = {
			temperature: rawWeather.current.temp,
			temperatureHigh: rawWeather.daily[0].temp.max ?? 0,
			temperatureLow: rawWeather.daily[0].temp.min ?? 0,
			humidity: rawWeather.current.humidity,
			percipitationChance: rawWeather.hourly[0].pop,
			windSpeed: rawWeather.hourly[0].wind_speed,
			windDir: rawWeather.hourly[0].wind_deg,
			weatherIcon: rawWeather.current.weather[0].id
		};
		// save dat DATA
		await fs.outputJSON(JSON_PATH, weather, { spaces: '\t' });
	} catch (err) {
		new Error('There was a problem retrieving the weather data!');
	}

	return weather;
}

export { updateOpenWeather as get, updateOpenWeather as update };

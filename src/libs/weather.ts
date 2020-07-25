import { Weather, OpenWeather } from '@mymicds/sdk';
import * as fs from 'fs-extra';
import config from './config';
import axios from 'axios';

export const JSON_PATH = __dirname + '/../api/weather.json';

// Coordinates for MICDS
const latitude = 38.658241;
const longitude = -90.3974471;

const openWeatherkey = config.openWeather.APIKey;

// endpoint for current weather and couple day's forecast for MICDS, in imperial units, without the by-minute data
const openWeatherEndpoint = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&appid=${openWeatherkey}&units=imperial&exclude=minutely`;

/**
 * Retrieves the weather. Checks the local file cache first, else updates the weather.
 * @returns A weather object.
 */
async function getOpenWeather() {
	let weatherJSON: Weather;
	try {
		weatherJSON = await fs.readJSON(JSON_PATH);
	} catch (e) {
		weatherJSON = await updateOpenWeather();
	}

	return weatherJSON;
}

/**
 * Retrieves the weather. Checks the local file cache first, else updates the weather.
 * @returns A weather object.
 */
async function updateOpenWeather() {
	let rawWeather: OpenWeather | null = null;
	let weather: Weather;

	// grab dat DATA
	try {
		let response = await axios.get(openWeatherEndpoint);
		rawWeather = response.data;
	} catch (err) {
		throw new Error('There was a problem fetching the weather data!');
	}

	if (rawWeather == null) {
		throw new Error('There was a problem fetching the weather data!');
	}

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
	try {
		await fs.outputJSON(JSON_PATH, weather, { spaces: '\t' });
	} catch (err) {
		throw new Error('There was a problem saving the weather data!');
	}

	return weather;
}

export { getOpenWeather as get, updateOpenWeather as update };

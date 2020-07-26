import { Weather } from '@mymicds/sdk';
import * as fs from 'fs-extra';
import axios from 'axios';
import config from './config';

export const JSON_PATH = __dirname + '/../api/weather.json';

// Coordinates for MICDS
const latitude = 38.658241;
const longitude = -90.3974471;

const openWeatherKey = config.openWeather.APIKey;

// endpoint for current weather and couple day's forecast for MICDS, in imperial units, without the by-minute data
const openWeatherEndpoint: string =
	'https://api.openweathermap.org/data/2.5/onecall?lat=' +
	String(latitude) +
	'&lon=' +
	String(longitude) +
	'&appid=' +
	openWeatherKey +
	'&units=imperial&exclude=minutely';

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
 * Grabs the Weather from OpenWeather Onecall API, converts it to MyMICDS
 * Weather Object, and saves it in json.
 * @returns A weather object.
 */
async function updateWeather() {
	let rawWeather: OpenWeather | null = null;

	// grab dat DATA
	try {
		const response = await axios.get(openWeatherEndpoint);
		rawWeather = response.data;
	} catch (err) {
		throw new Error('There was a problem fetching the weather data!');
	}

	if (rawWeather === null) {
		throw new Error('There was a problem fetching the weather data!');
	}

	// convert dat DATA
	const weather: Weather = {
		temperature: rawWeather.current.temp,
		temperatureHigh: rawWeather.daily[0].temp.max ?? 0,
		temperatureLow: rawWeather.daily[0].temp.min ?? 0,
		humidity: rawWeather.current.humidity,
		precipitationChance: rawWeather.hourly[0].pop,
		windSpeed: rawWeather.hourly[0].wind_speed,
		windDir: rawWeather.hourly[0].wind_deg,
		weatherIcon: rawWeather.current.weather[0].icon
	};

	// save dat DATA
	try {
		await fs.outputJSON(JSON_PATH, weather, { spaces: '\t' });
	} catch (err) {
		throw new Error('There was a problem saving the weather data!');
	}

	return weather;
}

export { getWeather as get, updateWeather as update };

/*
 	Open Weather interfaces below.
 	take note there is a "minutely" array, but our Open Weather request excludes it/
 */
interface OpenWeather {
	lat: number;
	lon: number;
	timezone: string;
	timezone_offset: number;
	current: OpenWeatherCurrentSnapshot;
	hourly: OpenWeatherHourSnapshot[];
	daily: OpenWeatherDaySnapshot[];
}

interface OpenWeatherCurrentSnapshot {
	dt: moment.Moment;
	sunrise: moment.Moment;
	sunset: moment.Moment;
	temp: number;
	feels_like: number;
	pressure: number;
	humidity: number;
	dew_point: number;
	clouds: number;
	uvi: number;
	visibility: number;
	wind_speed: number;
	wind_gust: number | null;
	wind_deg: number;
	rain: number | PrecipitationVolume;
	snow: number | PrecipitationVolume;
	weather: OpenWeatherSummary[];
}

interface OpenWeatherHourSnapshot {
	dt: moment.Moment;
	temp: number;
	feels_like: number;
	pressure: number;
	humidity: number;
	dew_point: number;
	clouds: number;
	visibility: number;
	wind_speed: number;
	wind_gust: number | null;
	wind_deg: number;
	rain: number | PrecipitationVolume;
	snow: number | PrecipitationVolume;
	pop: number;
	weather: OpenWeatherSummary[];
}

interface OpenWeatherDaySnapshot {
	dt: moment.Moment;
	sunrise: moment.Moment;
	sunset: moment.Moment;
	temp: TemperatureDaySnapshot;
	feels_like: TemperatureDaySnapshot;
	pressure: number;
	humidity: number;
	dew_point: number;
	clouds: number;
	uvi: number;
	visibility: number;
	wind_speed: number;
	wind_gust: number | null;
	wind_deg: number;
	pop: number;
	rain: number | PrecipitationVolume | null;
	snow: number | PrecipitationVolume | null;
	weather: OpenWeatherSummary[];
}

interface OpenWeatherSummary {
	id: string;
	main: string;
	description: string;
	icon: string;
}

interface PrecipitationVolume {
	h1: number;
}

interface TemperatureDaySnapshot {
	morn: number;
	day: number;
	eve: number;
	night: number;
	min: number | null;
	max: number | null;
}

import { InternalError } from './errors';
import { Weather } from '@mymicds/sdk';
import * as fs from 'fs-extra';
import axios from 'axios';
import config from './config';

export const JSON_PATH = __dirname + '/../api/weather.json';

// Coordinates for MICDS
const latitude = 38.658241;
const longitude = -90.3974471;

const openWeatherKey: string = config.openWeather.APIKey;

// Free OpenWeather endpoints for MICDS, in imperial units (One Call 2.5 was retired)
const openWeatherQuery = `lat=${latitude}&lon=${longitude}&appid=${openWeatherKey}&units=imperial`;
const currentEndpoint = `https://api.openweathermap.org/data/2.5/weather?${openWeatherQuery}`;
const forecastEndpoint = `https://api.openweathermap.org/data/2.5/forecast?${openWeatherQuery}`;

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
 * Grabs the current weather and 3-hour forecast from OpenWeather, converts it to
 * a MyMICDS Weather Object, and saves it in json.
 * @returns A weather object.
 */
async function updateWeather() {
	let current: OpenWeatherCurrent;
	let forecast: OpenWeatherForecast;

	// grab dat DATA
	try {
		const [currentRes, forecastRes] = await Promise.all([
			axios.get<OpenWeatherCurrent>(currentEndpoint),
			axios.get<OpenWeatherForecast>(forecastEndpoint)
		]);
		current = currentRes.data;
		forecast = forecastRes.data;
	} catch (e) {
		let reason = (e as Error).message;
		if (axios.isAxiosError(e) && e.response) {
			const data = e.response.data as { message?: string } | undefined;
			reason = `${e.response.status}: ${data?.message ?? e.response.statusText}`;
		}
		throw new InternalError(
			`There was a problem fetching the weather data! (${reason})`,
			e as Error
		);
	}

	if (!current?.main || !forecast?.list?.length) {
		throw new Error('There was a problem fetching the weather data!');
	}

	// High/low from the forecast blocks that fall on today's date in MICDS's timezone
	const localDate = (dt: number) =>
		new Date((dt + forecast.city.timezone) * 1000).toISOString().slice(0, 10);
	const today = localDate(current.dt);
	const todayBlocks = forecast.list.filter(block => localDate(block.dt) === today);

	let temperatureHigh = current.main.temp_max;
	let temperatureLow = current.main.temp_min;
	if (todayBlocks.length > 0) {
		temperatureHigh = Math.max(
			current.main.temp,
			...todayBlocks.map(block => block.main.temp_max)
		);
		temperatureLow = Math.min(
			current.main.temp,
			...todayBlocks.map(block => block.main.temp_min)
		);
	}

	// convert dat DATA
	const weather: Weather = {
		temperature: current.main.temp,
		temperatureHigh,
		temperatureLow,
		humidity: current.main.humidity,
		precipitationChance: forecast.list[0].pop,
		windSpeed: current.wind.speed,
		windDir: current.wind.deg,
		weatherIcon: current.weather[0].icon
	};

	// save dat DATA
	try {
		await fs.outputJSON(JSON_PATH, weather, { spaces: '\t' });
	} catch (e) {
		throw new InternalError('There was a problem saving the weather data!', e as Error);
	}

	return weather;
}

export { getWeather as get, updateWeather as update };

/*
 	Open Weather interfaces below.
 	Only the fields we use are typed. `dt` values are Unix timestamps in seconds.
 */
interface OpenWeatherCurrent {
	dt: number;
	main: OpenWeatherMain;
	wind: OpenWeatherWind;
	weather: OpenWeatherSummary[];
}

interface OpenWeatherForecast {
	list: OpenWeatherForecastBlock[];
	city: {
		// Shift in seconds from UTC
		timezone: number;
	};
}

interface OpenWeatherForecastBlock {
	dt: number;
	main: OpenWeatherMain;
	// Probability of precipitation, 0 to 1
	pop: number;
}

interface OpenWeatherMain {
	temp: number;
	temp_min: number;
	temp_max: number;
	humidity: number;
}

interface OpenWeatherWind {
	speed: number;
	deg: number;
}

interface OpenWeatherSummary {
	id: number;
	main: string;
	description: string;
	icon: string;
}

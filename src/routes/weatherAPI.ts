/**
 * @file Manages weather API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const weather = require(__dirname + '/../libs/weather.js');

module.exports = (app, db, socketIO) => {

	app.get('/weather', async (req, res) => {
		try {
			const weatherJSON = await weather.get();
			api.success(res, { weather: weatherJSON });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/weather/update', jwt.requireScope('admin'), async (req, res) => {
		try {
			const weatherJSON = await weather.update();
			socketIO.global('weather', weatherJSON);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};

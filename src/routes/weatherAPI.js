/**
 * @file Manages weather API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const weather = require(__dirname + '/../libs/weather.js');

module.exports = (app, db, socketIO) => {

	app.get('/weather', (req, res) => {
		weather.get((err, weatherJSON) => {
			api.respond(res, err, { weather: weatherJSON });
		});
	});

	app.post('/weather/update', jwt.requireScope('admin'), (req, res) => {
		weather.update((err, weatherJSON) => {
			if (!err) {
				socketIO.global('weather', weatherJSON);
			}
			api.respond(res, err);
		});
	});

};

/**
 * @file Manages sports API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const sports = require(__dirname + '/../libs/sports.js');

module.exports = app => {

	app.get('/sports', (req, res) => {
		sports.scores((err, scores) => {
			api.respond(res, err, { scores });
		});
	});

};

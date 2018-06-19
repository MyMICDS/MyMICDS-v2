/**
 * @file Manages sports API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const sports = require(__dirname + '/../libs/sports.js');

module.exports = app => {

	app.get('/sports', async (req, res) => {
		try {
			const scores = await sports.scores();
			api.success(res, { scores });
		} catch (err) {
			api.error(res, err);
		}
	});

};

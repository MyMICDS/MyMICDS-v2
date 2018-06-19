/**
 * @file Manages Snowday Calculator API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const snowdayCalculator = require(__dirname + '/../libs/snowdayCalculator.js');

module.exports = (app, db) => {

	app.get('/snowday', async (req, res) => {
		try {
			const data = await snowdayCalculator.calculate(db);
			api.success(res, { data });
		} catch (err) {
			api.error(res, err);
		}
	});

};

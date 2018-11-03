/**
 * @file Manages Snowday Calculator API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const snowdayCalculator = require(__dirname + '/../libs/snowdayCalculator.js');

module.exports = (app, db) => {

	app.get('/snowday', (req, res) => {
		snowdayCalculator.calculate(db, (err, data) => {
			api.respond(res, err, { data });
		});
	});

};

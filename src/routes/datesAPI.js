/**
 * @file Manages user API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const dates = require(__dirname + '/../libs/dates.js');

module.exports = app => {

	app.get('/dates/school-ends', (req, res) => {
		res.json({ date: dates.schoolEnds() });
	});

	app.get('/dates/breaks', (req, res) => {
		dates.getBreaks((err, breaks) => {
			api.respond(res, err, { breaks });
		});
	});

};

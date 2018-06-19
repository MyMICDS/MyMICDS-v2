/**
 * @file Manages user API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const dates = require(__dirname + '/../libs/dates.js');

module.exports = app => {

	app.get('/dates/school-starts', (req, res) => {
		api.success(res, { date: dates.schoolEnds() });
	});

	app.get('/dates/school-ends', (req, res) => {
		api.success(res, { date: dates.schoolEnds() });
	});

	app.get('/dates/breaks', async (req, res) => {
		try {
			const breaks = await dates.getBreaks();
			api.success(res, { breaks });
		} catch (err) {
			api.error(res, err);
		}
	});

};

/**
 * @file Manages lunch API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const lunch = require(__dirname + '/../libs/lunch.js');

module.exports = (app, db) => {

	app.get('/lunch', async (req, res) => {

		const current = new Date();

		const year = req.query.year || current.getFullYear();
		const month = req.query.month || current.getMonth() + 1;
		const day = req.query.day || current.getDate();

		const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		try {
			const lunchJSON = await lunch.get(db, date);
			api.success(res, { lunch: lunchJSON });
		} catch (err) {
			api.error(res, err);
		}
	});

};

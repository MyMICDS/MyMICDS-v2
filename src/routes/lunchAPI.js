/**
 * @file Manages lunch API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const lunch = require(__dirname + '/../libs/lunch.js');

module.exports = (app, db) => {

	app.post('/lunch/get', (req, res) => {

		const current = new Date();

		const year = req.body.year || current.getFullYear();
		const month = req.body.month || current.getMonth() + 1;
		const day = req.body.day || current.getDate();

		const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		lunch.get(db, date, (err, lunchJSON) => {
			api.respond(res, err, { lunch: lunchJSON });
		});
	});

};

/**
 * @file Manages schedule API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const schedule = require(__dirname + '/../libs/schedule.js');

module.exports = (app, db) => {
	app.get('/schedule', (req, res) => {
		const current = new Date();

		const year = req.query.year || current.getFullYear();
		const month = req.query.month || current.getMonth() + 1;
		const day = req.query.day || current.getDate();

		const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		schedule.get(db, req.apiUser, date, (err, hasURL, schedule) => {
			api.respond(res, err, { hasURL, schedule });
		});
	});

};

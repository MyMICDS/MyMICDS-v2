/**
 * @file Manages schedule API endpoints
 */
const schedule = require(__dirname + '/../libs/schedule.js');

module.exports = (app, db) => {
	app.post('/schedule/get', (req, res) => {
		const current = new Date();

		const year = req.body.year || current.getFullYear();
		const month = req.body.month || current.getMonth() + 1;
		const day = req.body.day || current.getDate();

		const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		schedule.get(db, req.user.user, date, (err, hasURL, schedule) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, hasURL, schedule });
		});
	});

};

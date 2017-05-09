/**
 * @file Manages lunch API endpoints
 */
const lunch = require(__dirname + '/../libs/lunch.js');

module.exports = (app, db) => {

	app.post('/lunch/get', (req, res) => {

		const current = new Date();

		const year = req.body.year || current.getFullYear();
		const month = req.body.month || current.getMonth() + 1;
		const day = req.body.day || current.getDate();

		const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

		lunch.get(db, date, (err, lunchJSON) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({
				error,
				lunch: lunchJSON
			});
		});
	});

};

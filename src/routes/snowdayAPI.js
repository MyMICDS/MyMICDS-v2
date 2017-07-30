/**
 * @file Manages Snowday Calculator API endpoints
 */
const snowdayCalculator = require(__dirname + '/../libs/snowdayCalculator.js');

module.exports = (app, db) => {

	app.post('/snowday/calculate', (req, res) => {
		snowdayCalculator.calculate(db, (err, data) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, data });
		});
	});

};

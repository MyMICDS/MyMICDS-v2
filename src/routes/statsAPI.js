/**
 * @file Manages stats API endpoints
 */
const stats = require(__dirname + '/../libs/stats.js');

module.exports = (app, db) => {

	app.post('/stats/get', (req, res) => {
		stats.get(db, (err, statsObj) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, stats: statsObj });
		});
	});

};

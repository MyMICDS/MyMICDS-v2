/**
 * @file Manages stats API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const stats = require(__dirname + '/../libs/stats.js');

module.exports = (app, db) => {

	app.post('/stats/get', (req, res) => {
		stats.get(db, (err, statsObj) => {
			api.respond(res, err, { stats: statsObj });
		});
	});

};

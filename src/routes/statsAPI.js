/**
 * @file Manages stats API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const stats = require(__dirname + '/../libs/stats.js');

module.exports = (app, db) => {

	app.get('/stats', async (req, res) => {
		try {
			const statsObj = await stats.get(db);
			api.success(res, { stats: statsObj });
		} catch (err) {
			api.error(res, err);
		}
	});

};

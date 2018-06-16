/**
 * @file Manages notifications API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const notifications = require(__dirname + '/../libs/notifications.js');

module.exports = (app, db) => {

	app.post('/notifications/unsubscribe', async (req, res) => {
		let user = req.user.user;
		let hash = true;

		if (!user) {
			user = req.body.user;
			hash = req.body.hash;
		}

		try {
			await notifications.unsubscribe(db, user, hash, req.body.scopes);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};

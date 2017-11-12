/**
 * @file Manages notifications API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const notifications = require(__dirname + '/../libs/notification.js');

module.exports = (app, db) => {

	app.post('/notification/get', (req, res) => {
		notifications.get(db, req.apiUser, true, (err, events) => {
			api.respond(res, err, { events });
		});
	});
};

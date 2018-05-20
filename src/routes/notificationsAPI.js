const notifications = require(__dirname + '/../libs/notifications.js');

module.exports = (app, db) => {

	app.post('/notifications/unsubscribe', (req, res) => {
		notifications.unsubscribe(db, req.user.user, req.body.hash, req.body.scopes, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

};

const notifications = require(__dirname + '/../libs/notifications.js');

module.exports = (app, db) => {

	app.post('/notifications/disable', (req, res) => {
		notifications.disable(db, req.user.user, req.body.type, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/notifications/enable', (req, res) => {
		notifications.enable(db, req.user.user, req.body.type, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/notifications/unsubscribe', (req, res) => {
		notifications.unsubscribe(db, req.user.user, req.body.id, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

};

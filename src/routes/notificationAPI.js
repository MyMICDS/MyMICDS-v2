const notifications = require(__dirname + '/../libs/notification.js');

module.exports = (app, db) => {

	app.post('/notification/get', (req, res) => {
		notifications.get(db, req.user.user, true, (err, events) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, events });
		});
	});
};

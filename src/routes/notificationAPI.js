"use strict";

var notifications = require(__dirname + '/../libs/notification.js');

module.exports = (app, db) => {

    app.post('/notification/get', (req, res) => {
        notifications.get(db, req.user.user, true, (err, events) => {
            if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error : errorMessage,
				events: events
			});
        })
    })
}
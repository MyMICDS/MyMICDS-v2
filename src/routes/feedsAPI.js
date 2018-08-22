/**
 * @file Manages feeds API endpoints
 */
const feeds = require(__dirname + '/../libs/feeds.js');

module.exports = (app, db) => {

	app.post('/feeds/update-canvas-cache', (req, res) => {
		feeds.updateCanvasCache(db, req.user.user, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/feeds/add-portal-queue', (req, res) => {
		feeds.addPortalQueueClasses(db, req.user.user, err => {
			if(err) {
				res.json({ error: err.message });
				return;
			}
			feeds.addPortalQueueCalendar(db, req.user.user, err => {
				let error = null;
				if (err) {
					error = err.message;
				}
				res.json({ error });
			});
		});
	});

};

/**
 * @file Manages Canvas API endpoints
 */
const canvas = require(__dirname + '/../libs/canvas.js');
const feeds  = require(__dirname + '/../libs/feeds.js');

module.exports = (app, db, socketIO) => {
	app.post('/canvas/test-url', (req, res) => {
		canvas.verifyURL(req.body.url, (err, isValid, url) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({
				error,
				valid: isValid,
				url  : url
			});
		});
	});

	app.post('/canvas/set-url', (req, res) => {
		canvas.setURL(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'canvas', 'set-url', validURL);
			}
			res.json({
				error,
				valid: isValid,
				url  : validURL
			});
		});
	});

	app.post('/canvas/get-events', (req, res) => {
		feeds.canvasCacheRetry(db, req.user.user, (err, hasURL, events) => {
			let error = null;
			if (err) {
				error = err.message;
			}
			res.json({ error, hasURL, events });
		});
	});

	app.post('/canvas/get-classes', (req, res) => {
		canvas.getClasses(db, req.user.user, (err, hasURL, classes) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, hasURL, classes });
		});
	});
};

/**
 * @file Manages Portal API endpoints
 */
const portal = require(__dirname + '/../libs/portal.js');

module.exports = (app, db, socketIO) => {
	app.post('/portal/test-url', (req, res) => {
		portal.verifyURL(req.body.url, (err, isValid, url) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({
				error,
				valid: isValid,
				url
			});
		});
	});

	app.post('/portal/set-url', (req, res) => {
		portal.setURL(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'portal', 'set-url', validURL);
			}
			res.json({
				error,
				valid: isValid,
				url  : validURL
			});
		});
	});

	app.post('/portal/get-classes', (req, res) => {
		portal.getClasses(db, req.user.user, (err, hasURL, classes) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, hasURL, classes });
		});
	});

	app.post('/portal/day-rotation', (req, res) => {
		portal.getDayRotations((err, days) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, days });
		});
	});

};

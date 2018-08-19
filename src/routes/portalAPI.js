/**
 * @file Manages Portal API endpoints
 */
const portal = require(__dirname + '/../libs/portal.js');

module.exports = (app, db, socketIO) => {

	app.post('/portal/test-url-classes', (req, res) => {
		portal.verifyURLClasses(req.body.url, (err, isValid, url) => {
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

	app.post('/portal/test-url-calendar', (req, res) => {
		portal.verifyURLCalendar(req.body.url, (err, isValid, url) => {
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

	app.post('/portal/set-url-classes', (req, res) => {
		portal.setURLClasses(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'portal', 'set-url-classes', validURL);
			}
			res.json({
				error,
				valid: isValid,
				url  : validURL
			});
		});
	});

	app.post('/portal/set-url-calendar', (req, res) => {
		portal.setURLCalendar(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'portal', 'set-url-calendar', validURL);
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

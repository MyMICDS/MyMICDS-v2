/**
 * @file Manages Portal API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const portal = require(__dirname + '/../libs/portal.js');

module.exports = (app, db, socketIO) => {
	app.post('/portal/test', (req, res) => {
		portal.verifyURL(req.body.url, (err, isValid, url) => {
			api.respond(res, err, { valid: isValid, url });
		});
	});

	app.put('/portal/url', jwt.requireLoggedIn, (req, res) => {
		portal.setURL(db, req.apiUser, req.body.url, (err, isValid, validURL) => {
			if (!err) {
				socketIO.user(req.apiUser, 'portal', 'set-url', validURL);
			}
			api.respond(res, err, { valid: isValid, url: validURL });
		});
	});

	app.get('/portal/classes', jwt.requireLoggedIn, (req, res) => {
		portal.getClasses(db, req.apiUser, (err, hasURL, classes) => {
			api.respond(res, err, { hasURL, classes });
		});
	});

	app.get('/portal/day-rotation', (req, res) => {
		portal.getDayRotations((err, days) => {
			api.respond(res, err, { days });
		});
	});

};

/**
 * @file Manages Portal API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const portal = require(__dirname + '/../libs/portal.js');

module.exports = (app, db, socketIO) => {
	app.post('/portal/test-url', (req, res) => {
		portal.verifyURL(req.body.url, (err, isValid, url) => {
			api.respond(res, err, { valid: isValid, url });
		});
	});

	app.post('/portal/set-url', jwt.requireLoggedIn, (req, res) => {
		portal.setURL(db, req.user.user, req.body.url, (err, isValid, validURL) => {
			if(!err) {
				socketIO.user(req.user.user, 'portal', 'set-url', validURL);
			}
			api.respond(res, err, { valid: isValid, url: validURL });
		});
	});

	app.post('/portal/get-classes', jwt.requireLoggedIn, (req, res) => {
		portal.getClasses(db, req.user.user, (err, hasURL, classes) => {
			api.respond(res, err, { hasURL, classes });
		});
	});

	app.post('/portal/day-rotation', (req, res) => {
		portal.getDayRotations((err, days) => {
			api.respond(res, err, { days });
		});
	});

};

/**
 * @file Manages Portal API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const portal = require(__dirname + '/../libs/portal.js');

module.exports = (app, db, socketIO) => {

	app.post('/portal/test', async (req, res) => {
		try {
			const { isValid, url } = await portal.verifyURL(req.body.url);
			api.success(res, { valid: isValid, url });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/portal/url', jwt.requireLoggedIn, async (req, res) => {
		try {
			const { isValid, validURL } = await portal.setURL(db, req.apiUser, req.body.url);
			socketIO.user(req.apiUser, 'portal', 'set-url', validURL);
			api.success(res, { valid: isValid, url: validURL });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/portal/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			const responseObj = await portal.getClasses(db, req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/portal/day-rotation', async (req, res) => {
		try {
			const days = await portal.getDayRotations();
			api.success(res, { days });
		} catch (err) {
			api.error(res, err);
		}
	});

};

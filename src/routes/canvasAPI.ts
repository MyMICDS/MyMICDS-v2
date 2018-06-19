/**
 * @file Manages Canvas API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const canvas = require(__dirname + '/../libs/canvas.js');
const feeds = require(__dirname + '/../libs/feeds.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db, socketIO) => {
	app.post('/canvas/test', async (req, res) => {
		try {
			const { isValid, url } = await canvas.verifyURL(req.body.url);
			api.success(res, { valid: isValid, url });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/canvas/url', jwt.requireLoggedIn, async (req, res) => {
		try {
			const { isValid, validURL } = await canvas.setURL(db, req.apiUser, req.body.url);
			socketIO.user(req.apiUser, 'canvas', 'set-url', validURL);
			api.success(res, { valid: isValid, url: validURL });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/canvas/events', jwt.requireLoggedIn, async (req, res) => {
		try {
			const responseObj = await feeds.canvasCacheRetry(db, req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/canvas/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			const responseObj = await canvas.getClasses(db, req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});
};

/**
 * @file Manages alias API endpoints
 */

const aliases = require(__dirname + '/../libs/aliases.js');
const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db, socketIO) => {

	app.post('/alias', jwt.requireLoggedIn, async (req, res) => {
		try {
			const aliasId = await aliases.add(db, req.apiUser, req.body.type, req.body.classString, req.body.classId);
			socketIO.user(req.apiUser, 'alias', 'add', {
				_id: aliasId,
				type: req.body.type,
				classNative: req.body.classId,
				classRemote: req.body.classString
			});
			api.success(res, { id: aliasId });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/alias', jwt.requireLoggedIn, async (req, res) => {
		try {
			const aliasList = await aliases.list(db, req.apiUser);
			api.success(res, { aliases: aliasList });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.delete('/alias', jwt.requireLoggedIn, async (req, res) => {
		try {
			await aliases.delete(db, req.apiUser, req.body.type, req.body.id);
			socketIO.user(req.apiUser, 'alias', 'delete', req.body.id);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};

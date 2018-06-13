/**
 * @file Manages alias API endpoints
 */

const aliases = require(__dirname + '/../libs/aliases.js');
const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db, socketIO) => {

	app.post('/alias', jwt.requireLoggedIn, (req, res) => {
		aliases.add(db, req.apiUser, req.body.type, req.body.classString, req.body.classId, (err, aliasId) => {
			if (!err) {
				socketIO.user(req.apiUser, 'alias', 'add', {
					_id: aliasId,
					type: req.body.type,
					classNative: req.body.classId,
					classRemote: req.body.classString
				});
			}
			api.respond(res, err, { id: aliasId });
		});
	});

	app.get('/alias', jwt.requireLoggedIn, (req, res) => {
		aliases.list(db, req.apiUser, (err, aliases) => {
			api.respond(res, err, { aliases });
		});
	});

	app.delete('/alias', jwt.requireLoggedIn, (req, res) => {
		aliases.delete(db, req.apiUser, req.body.type, req.body.id, err => {
			if (!err) {
				socketIO.user(req.apiUser, 'alias', 'delete', req.body.id);
			}
			api.respond(res, err);
		});
	});

};

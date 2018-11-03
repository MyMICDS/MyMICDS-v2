/**
 * @file Manages class API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const classes = require(__dirname + '/../libs/classes.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db, socketIO) => {

	app.get('/classes', jwt.requireLoggedIn, (req, res) => {
		classes.get(db, req.apiUser, (err, classes) => {
			api.respond(res, err, { classes });
		});
	});

	app.post('/classes', jwt.requireLoggedIn, (req, res) => {
		const user = req.apiUser;
		const scheduleClass = {
			_id: req.body.id,
			name: req.body.name,
			color: req.body.color,
			block: req.body.block,
			type: req.body.type,
			teacher: {
				prefix: req.body.teacherPrefix,
				firstName: req.body.teacherFirstName,
				lastName: req.body.teacherLastName
			}
		};

		classes.upsert(db, user, scheduleClass, (err, scheduleClass) => {
			if(!err) {
				socketIO.user(req.apiUser, 'classes', 'add', scheduleClass);
			}
			api.respond(res, err, { id: scheduleClass ? scheduleClass._id : null });
		});
	});

	app.delete('/classes', jwt.requireLoggedIn, (req, res) => {
		classes.delete(db, req.apiUser, req.body.id, err => {
			if(!err) {
				socketIO.user(req.apiUser, 'classes', 'delete', req.body.id);
			}
			api.respond(res, err);
		});
	});

};

'use strict';

/**
 * @file Manages class API endpoints
 */
const classes = require(__dirname + '/../libs/classes.js');

module.exports = (app, db, socketIO) => {

	app.post('/classes/get', (req, res) => {
		classes.get(db, req.user.user, (err, classes) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}
			res.json({
				error: errorMessage,
				classes: classes
			});
		});
	});

	app.post('/classes/add', (req, res) => {
		const user = req.user.user;
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
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
				socketIO.user(req.user.user, 'classes', 'add', scheduleClass);
			}
			res.json({
				error: errorMessage,
				id: scheduleClass ? scheduleClass._id : null
			});
		});
	});

	app.post('/classes/delete', (req, res) => {
		classes.delete(db, req.user.user, req.body.id, err => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
				socketIO.user(req.user.user, 'classes', 'delete', req.body.id);
			}
			res.json({ error: errorMessage });
		});
	});

};

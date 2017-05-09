/**
 * @file Manages class API endpoints
 */
const classes = require(__dirname + '/../libs/classes.js');

module.exports = (app, db, socketIO) => {

	app.post('/classes/get', (req, res) => {
		classes.get(db, req.user.user, (err, classes) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, classes });
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
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'classes', 'add', scheduleClass);
			}
			res.json({
				error,
				id: scheduleClass ? scheduleClass._id : null
			});
		});
	});

	app.post('/classes/delete', (req, res) => {
		classes.delete(db, req.user.user, req.body.id, err => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'classes', 'delete', req.body.id);
			}
			res.json({ error });
		});
	});

};

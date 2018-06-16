/**
 * @file Manages class API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const classes = require(__dirname + '/../libs/classes.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db, socketIO) => {

	app.get('/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			const classResult = await classes.get(db, req.apiUser);
			api.success(res, { classes: classResult });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/classes', jwt.requireLoggedIn, async (req, res) => {
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

		try {
			const classResult = await classes.upsert(db, user, scheduleClass);
			api.success(res, { id: classResult ? classResult._id : null });
			socketIO.user(req.apiUser, 'classes', 'add', scheduleClass);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.delete('/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			await classes.delete(db, req.apiUser, req.body.id);
			socketIO.user(req.apiUser, 'classes', 'delete', req.body.id);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};

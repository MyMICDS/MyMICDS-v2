/**
 * @file Manages teachers API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const teachers = require(__dirname + '/../libs/teachers.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db) => {

	app.get('/teachers', jwt.requireLoggedIn, async (req, res) => {
		try {
			const teachersResult = await teachers.list(db);
			api.success(res, { teachers: teachersResult });
		} catch (err) {
			api.error(res, err);
		}
	});

};

/**
 * @file Manages class API endpoints
 */
const teachers = require(__dirname + '/../libs/teachers.js');

module.exports = (app, db) => {

	app.post('/teachers/list', (req, res) => {
		teachers.list(db, (err, teachers) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, teachers });
		});
	});

};

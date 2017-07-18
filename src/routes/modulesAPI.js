/**
 * @file Manages modules API endpoints
 */

const modules = require(__dirname + '/../libs/modules.js');

module.exports = (app, db) => {

	app.post('/modules/get', (req, res) => {
		modules.get(db, req.user.user, (err, modules) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, modules });
		});
	});

	app.post('/modules/upsert', (req, res) => {
		modules.upsert(db, req.user.user, req.body.modules, err => {
			let error = null;
			if(err) {
				error = err.message;
				res.json({ error });
			}

			// Return new modules + ids
			modules.get(db, req.user.user, (err, modules) => {
				let error = null;
				if(err) {
					error = err.message;
				}
				res.json({ error, modules });
			});
		});
	});

};

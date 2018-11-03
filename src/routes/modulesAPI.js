/**
 * @file Manages modules API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const modules = require(__dirname + '/../libs/modules.js');

module.exports = (app, db) => {

	app.get('/modules', (req, res) => {
		modules.get(db, req.apiUser, (err, modules) => {
			api.respond(res, err, { modules });
		});
	});

	// app.get('/modules/all', (req, res) => {
	// 	modules.getAll(db, (err, modules) => {
	// 		api.respond(res, err, { modules });
	// 	});
	// });

	app.put('/modules', (req, res) => {
		modules.upsert(db, req.apiUser, req.body.modules, err => {
			if(err) {
				api.respond(res, err);
				return;
			}

			// Return new modules + ids
			modules.get(db, req.apiUser, (err, modules) => {
				api.respond(res, err, { modules });
			});
		});
	});

};

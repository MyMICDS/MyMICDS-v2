/**
 * @file Manages modules API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const modules = require(__dirname + '/../libs/modules.js');

module.exports = (app, db) => {

	app.get('/modules', async (req, res) => {
		try {
			const modulesResult = await modules.get(db, req.apiUser);
			api.success(res, { modules: modulesResult });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/modules/all', async (req, res) => {
		try {
			const modulesResult = await modules.getAll(db);
			api.success(res, { modules: modulesResult });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/modules', async (req, res) => {
		try {
			await modules.upsert(db, req.apiUser, req.body.modules);
		} catch (err) {
			api.error(res, err);
		}

		try {
			const modulesResult = await modules.get(db, req.apiUser);
			api.success(res, { modules: modulesResult });
		} catch (err) {
			api.error(res, err);
		}
	});

};

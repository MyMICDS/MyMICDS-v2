import { assertType } from 'typescript-is';
import { UpdateModulesParameters } from '@mymicds/sdk';
import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import * as modules from '../libs/modules';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.get('/modules', async (req, res) => {
		try {
			const modulesResult = await modules.get(db, req.apiUser || '');
			api.success(res, { modules: modulesResult });
		} catch (err) {
			api.error(res, err);
		}
	});

	// app.get('/modules/all', async (req, res) => {
	// 	try {
	// 		const modulesResult = await modules.getAll(db);
	// 		api.success(res, { modules: modulesResult });
	// 	} catch (err) {
	// 		api.error(res, err);
	// 	}
	// });

	app.put('/modules', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertType<UpdateModulesParameters>(req.body);
			await modules.upsert(db, req.apiUser!, req.body.modules);
		} catch (err) {
			api.error(res, err);
			return;
		}

		try {
			const modulesResult = await modules.get(db, req.apiUser!);
			api.success(res, { modules: modulesResult });
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

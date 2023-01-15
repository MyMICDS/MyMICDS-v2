import { UpdateModulesParameters } from '@mymicds/sdk';
import { assertEquals } from 'typia';
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
			api.error(res, err as Error);
		}
	});

	// app.get('/modules/all', async (req, res) => {
	// 	try {
	// 		const modulesResult = await modules.getAll(db);
	// 		api.success(res, { modules: modulesResult });
	// 	} catch (err) {
	// 		api.error(res, err as Error);
	// 	}
	// });

	app.put('/modules', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertEquals<UpdateModulesParameters>(req.body);
			await modules.upsert(db, req.apiUser!, req.body.modules);
		} catch (err) {
			api.error(res, err as Error);
			return;
		}

		try {
			const modulesResult = await modules.get(db, req.apiUser!);
			api.success(res, { modules: modulesResult });
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

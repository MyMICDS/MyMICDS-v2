import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import * as teachers from '../libs/teachers';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.get('/teachers', jwt.requireLoggedIn, async (req, res) => {
		try {
			const teachersResult = await teachers.list(db);
			api.success(res, { teachers: teachersResult });
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

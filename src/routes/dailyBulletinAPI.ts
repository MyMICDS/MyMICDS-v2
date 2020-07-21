import * as api from '../libs/api';
import * as dailyBulletin from '../libs/dailyBulletin';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default (app => {
	app.get('/daily-bulletin', async (req, res) => {
		try {
			const bulletins = await dailyBulletin.getList();
			api.success(res, {
				baseURL: dailyBulletin.baseURL,
				bulletins
			});
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/daily-bulletin/query', jwt.requireScope('admin'), async (req, res) => {
		try {
			await dailyBulletin.queryLatest();
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/daily-bulletin/query-all', jwt.requireScope('admin'), async (req, res) => {
		try {
			await dailyBulletin.queryAll();
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

import * as api from '../libs/api';
import * as dailyBulletin from '../libs/dailyBulletin';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default (app => {
	app.get('/daily-bulletin', async (req, res) => {
		try {
			const { bulletin, bulletinDate } = await dailyBulletin.getGDocBulletin();
			api.success(res, {
				baseURL: dailyBulletin.baseURL,
				bulletin,
				bulletinDate
			});
		} catch (err) {
			api.error(res, err as Error);
		}
	});

	app.get('/daily-bulletin/pdf', async (req, res) => {
		try {
			const bulletins = await dailyBulletin.getPdfBulletinList();
			api.success(res, {
				baseURL: dailyBulletin.baseURL,
				bulletins
			});
		} catch (err) {
			api.error(res, err as Error);
		}
	});

	app.post('/daily-bulletin/query', jwt.requireScope('admin'), async (req, res) => {
		try {
			await dailyBulletin.queryLatest();
			api.success(res);
		} catch (err) {
			api.error(res, err as Error);
		}
	});

	app.post('/daily-bulletin/pdf/query-all', jwt.requireScope('admin'), async (req, res) => {
		try {
			await dailyBulletin.queryAll();
			api.success(res);
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

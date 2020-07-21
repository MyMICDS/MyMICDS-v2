import * as api from '../libs/api';
import * as sports from '../libs/sports';
import RoutesFunction from './routesFunction';

export default (app => {
	app.get('/sports', async (req, res) => {
		try {
			const scores = await sports.scores();
			api.success(res, { scores });
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

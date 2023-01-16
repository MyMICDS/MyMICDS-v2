import * as api from '../libs/api';
import * as stats from '../libs/stats';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.get('/stats', async (req, res) => {
		try {
			const statsObj = await stats.get(db);
			api.success(res, { stats: statsObj });
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

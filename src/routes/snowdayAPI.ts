import * as api from '../libs/api';
import * as snowdayCalculator from '../libs/snowdayCalculator';
import RoutesFunction from './routesFunction';

export default (app => {
	app.get('/snowday', async (req, res) => {
		try {
			const data = await snowdayCalculator.calculate();
			api.success(res, { data });
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

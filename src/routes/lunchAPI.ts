import * as api from '../libs/api';
import * as lunch from '../libs/lunch';
import RoutesFunction from './routesFunction';

export default ((app, db) => {

	app.get('/lunch', async (req, res) => {

		const current = new Date();

		const year = req.query.year || current.getFullYear();
		const month = req.query.month || current.getMonth() + 1;
		const day = req.query.day || current.getDate();

		const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));

		try {
			const lunchJSON = await lunch.get(db, date);
			api.success(res, { lunch: lunchJSON });
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

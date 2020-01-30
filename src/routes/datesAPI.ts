import * as api from '../libs/api';
import * as dates from '../libs/dates';
import RoutesFunction from './routesFunction';

export default (app => {

	app.get('/dates/school-starts', (req, res) => {
		api.success(res, { date: dates.schoolStarts() });
	});

	app.get('/dates/school-ends', (req, res) => {
		api.success(res, { date: dates.schoolEnds() });
	});

	app.get('/dates/breaks', async (req, res) => {
		try {
			const breaks = await dates.getBreaks();
			api.success(res, { breaks });
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

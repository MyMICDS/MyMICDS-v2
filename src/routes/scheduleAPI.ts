import * as api from '../libs/api';
import * as schedule from '../libs/schedule';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.get('/schedule', async (req, res) => {
		const current = new Date();

		const year = req.query.year || current.getFullYear();
		const month = req.query.month || current.getMonth() + 1;
		const day = req.query.day || current.getDate();

		const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));

		try {
			const responseObj = await schedule.get(db, req.apiUser!, date);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	// app.get('/block-schedule', async (req, res) => {
	// 	try {
	// 		const data = await fs.readFile(__dirname + '/../schedules/' + req.query.grade, 'utf8');
	// 		api.success(res, data);
	// 	} catch (err) {
	// 		api.error(res, err);
	// 	}
	// });
}) as RoutesFunction;

import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import * as weather from '../libs/weather';
import RoutesFunction from './routesFunction';

export default ((app, db, socketIO) => {
	app.get('/weather', async (req, res) => {
		try {
			const weatherJSON = await weather.get();
			api.success(res, { weather: weatherJSON });
		} catch (err) {
			api.error(res, err as Error);
		}
	});

	app.post('/weather/update', jwt.requireScope('admin'), async (req, res) => {
		try {
			const weatherJSON = await weather.update();
			socketIO.global('weather', weatherJSON);
			api.success(res);
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

import * as api from '../libs/api';
import * as feeds from '../libs/feeds';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.post('/feeds/canvas-cache', jwt.requireLoggedIn, async (req, res) => {
		try {
			await feeds.updateCanvasCache(db, req.apiUser!);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/feeds/portal-queue', jwt.requireLoggedIn, async (req, res) => {
		try {
			await feeds.addPortalQueueClasses(db, req.apiUser!);
			await feeds.addPortalQueueCalendar(db, req.apiUser!);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

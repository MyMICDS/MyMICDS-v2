import * as api from '../libs/api';
import * as notifications from '../libs/notifications';
import RoutesFunction from './routesFunction';

export default ((app, db) => {

	app.post('/notifications/unsubscribe', async (req, res) => {
		let user = req.user.user;
		let hash = true;

		if (!user) {
			user = req.body.user;
			hash = req.body.hash;
		}

		try {
			await notifications.unsubscribe(db, user, hash, req.body.scopes);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

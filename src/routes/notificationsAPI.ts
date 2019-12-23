import { UnsubscribeParameters } from '@mymicds/sdk';
import { assertType } from 'typescript-is';
import * as api from '../libs/api';
import * as notifications from '../libs/notifications';
import RoutesFunction from './routesFunction';

export default ((app, db) => {

	app.post('/notifications/unsubscribe', async (req, res) => {
		try {
			assertType<UnsubscribeParameters>(req.body);
		} catch (err) {
			api.error(res, err);
			return;
		}

		let user = req.apiUser;
		let hash = true;

		if (!user) {
			user = req.body.user;
			hash = req.body.hash;
		}

		try {
			await notifications.unsubscribe(db, user!, hash, req.body.scopes);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

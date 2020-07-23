import { assertType } from 'typescript-is';
import { Scope } from '@mymicds/sdk';
import * as api from '../libs/api';
import * as notifications from '../libs/notifications';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.post('/notifications/unsubscribe', async (req, res) => {
		// Union type is being difficult so we need to split this up
		try {
			assertType<{ scopes: Scope | Scope[] }>(req.body);
		} catch (err) {
			api.error(res, err);
			return;
		}

		let user = req.apiUser;
		let hash: string | true = true;

		if (!user) {
			try {
				assertType<{ user: string; hash: string }>(req.body);
			} catch (err) {
				api.error(res, err);
				return;
			}
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

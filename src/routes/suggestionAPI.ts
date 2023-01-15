import { SubmitSuggestionParameters } from '@mymicds/sdk';
import { assertEquals } from 'typia';
import * as admins from '../libs/admins';
import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.post('/suggestion', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertEquals<SubmitSuggestionParameters>(req.body);
			await admins.sendEmail(db, {
				subject: `Suggestion From: ${req.apiUser!}`,
				html: `Suggestion From: ${req.apiUser!}\nType: ${
					req.body.type as string
				}\nSubmission: ${req.body.submission as string}`
			});
			api.success(res);
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

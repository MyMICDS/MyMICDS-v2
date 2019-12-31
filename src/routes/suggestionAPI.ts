import { SubmitSuggestionParameters } from '@mymicds/sdk';
import { assertType } from 'typescript-is';
import * as admins from '../libs/admins';
import * as api from '../libs/api';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.post('/suggestion', async (req, res) => {
		try {
			assertType<SubmitSuggestionParameters>(req.body);
			await admins.sendEmail(db, {
				subject: 'Suggestion From: ' + req.apiUser,
				html: `Suggestion From: ${req.apiUser}\nType: ${req.body.type}\nSubmission: ${req.body.submission}`
			});
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

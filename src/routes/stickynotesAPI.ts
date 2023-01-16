import { AddStickyNoteParameters, GetStickyNoteParameters } from '@mymicds/sdk';
import { assertEquals } from 'typia';

import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import * as stickynotes from '../libs/stickynotes';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.get('/stickynotes', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertEquals<GetStickyNoteParameters>(req.query);
			const note = await stickynotes.get(db, req.apiUser!, req.query.moduleId);
			api.success(res, note);
		} catch (err) {
			api.error(res, err as Error);
		}
	});

	app.put('/stickynotes', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertEquals<AddStickyNoteParameters>(req.body);
			await stickynotes.post(db, req.apiUser!, req.body.moduleId, req.body.text);
			api.success(res);
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

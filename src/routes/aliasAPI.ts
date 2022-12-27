import { AddAliasParameters, DeleteAliasParameters } from '@mymicds/sdk';
import { assertEquals } from 'typia';
import * as aliases from '../libs/aliases';
import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default ((app, db, socketIO) => {
	app.post('/alias', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertEquals<AddAliasParameters>(req.body);
			const aliasId = await aliases.add(
				db,
				req.apiUser!,
				req.body.type,
				req.body.classString,
				req.body.classId
			);
			socketIO.user(req.apiUser!, 'alias', 'add', {
				_id: aliasId,
				type: req.body.type,
				classNative: req.body.classId,
				classRemote: req.body.classString
			});
			api.success(res, { id: aliasId });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/alias', jwt.requireLoggedIn, async (req, res) => {
		try {
			const aliasList = await aliases.list(db, req.apiUser!);
			api.success(res, { aliases: aliasList });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.delete('/alias', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertEquals<DeleteAliasParameters>(req.body);
			await aliases.delete(db, req.apiUser!, req.body.type, req.body.id);
			socketIO.user(req.apiUser!, 'alias', 'delete', req.body.id);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

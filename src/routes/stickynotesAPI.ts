import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import * as stickynotes from '../libs/stickynotes';
import RoutesFunction from './routesFunction';

export default ((app, db) => {

	app.get('/stickynotes', jwt.requireLoggedIn, async (req, res) => {
		try {
			const note = await stickynotes.get(db, req.apiUser!, req.query.moduleId);
			api.success(res, note);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/stickynotes', jwt.requireLoggedIn, async (req, res) => {
		try {
			await stickynotes.post(db, req.apiUser!, req.body.moduleId, req.body.text);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

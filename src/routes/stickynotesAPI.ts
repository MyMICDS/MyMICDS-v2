import * as api from '../libs/api';
import * as stickynotes from '../libs/stickynotes';
import RoutesFunction from './routesFunction';

export default ((app, db) => {

	app.get('/stickynotes', async (req, res) => {
		try {
			const note = await stickynotes.get(db, req.user.user, req.query.moduleId);
			api.success(res, { stickynote: note });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/stickynotes', async (req, res) => {
		try {
			await stickynotes.post(db, req.user.user, req.body.moduleId, req.body.text);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

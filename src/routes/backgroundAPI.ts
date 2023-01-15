import * as api from '../libs/api';
import * as backgrounds from '../libs/backgrounds';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default ((app, db, socketIO) => {
	app.get('/background', async (req, res) => {
		try {
			const responseObj = await backgrounds.get(req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err as Error);
		}
	});

	app.get('/background/all', jwt.requireScope('admin'), async (req, res) => {
		try {
			const responseObj = await backgrounds.getAll(db);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err as Error);
		}
	});

	app.put('/background', jwt.requireLoggedIn, (req, res) => {
		// Write image to user-backgrounds
		backgrounds.upload()(req, res, async uploadErr => {
			if (uploadErr) {
				api.error(res, uploadErr);
				return;
			}

			// Add blurred version of image
			try {
				await backgrounds.blurUser(req.apiUser!);
			} catch (err) {
				api.error(res, err as Error);
				return;
			}

			socketIO.user(req.apiUser!, 'background', 'upload');

			try {
				const responseObj = await backgrounds.get(req.apiUser);
				api.success(res, responseObj);
			} catch (err) {
				api.error(res, err as Error);
			}
		});
	});

	app.delete('/background', jwt.requireLoggedIn, async (req, res) => {
		try {
			await backgrounds.delete(req.apiUser!);
		} catch (err) {
			api.error(res, err as Error);
			return;
		}

		try {
			const responseObj = await backgrounds.get(req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err as Error);
		}
	});
}) as RoutesFunction;

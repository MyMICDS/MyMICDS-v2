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
			api.error(res, err);
		}
	});

	app.get('/background/all', async (req, res) => {
		try {
			const responseObj = await backgrounds.getAll(db);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/background', jwt.requireLoggedIn, (req, res) => {
		// Write image to user-backgrounds
		backgrounds.upload()(req, res, async err => {
			if (err) {
				api.error(res, err);
				return;
			}

			// Add blurred version of image
			try {
				await backgrounds.blurUser(req.apiUser!);
			} catch (err) {
				api.error(res, err);
				return;
			}

			socketIO.user(req.apiUser!, 'background', 'upload');

			try {
				const responseObj = await backgrounds.get(req.apiUser);
				api.success(res, responseObj);
			} catch (err) {
				api.error(res, err);
			}
		});
	});

	app.delete('/background', jwt.requireLoggedIn, async (req, res) => {
		try {
			await backgrounds.delete(req.apiUser!);
		} catch (err) {
			api.error(res, err);
			return;
		}

		try {
			const responseObj = await backgrounds.get(req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

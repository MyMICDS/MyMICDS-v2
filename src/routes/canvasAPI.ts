import { assertType } from 'typescript-is';
import { SetCanvasURLParameters, TestCanvasURLParameters } from '@mymicds/sdk';
import * as api from '../libs/api';
import * as canvas from '../libs/canvas';
import * as feeds from '../libs/feeds';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default ((app, db, socketIO) => {
	app.post('/canvas/test', async (req, res) => {
		try {
			assertType<TestCanvasURLParameters>(req.body);
			const { isValid, url } = await canvas.verifyURL(req.body.url);
			api.success(res, { valid: isValid, url });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/canvas/url', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertType<SetCanvasURLParameters>(req.body);
			const { isValid, validURL } = await canvas.setURL(db, req.apiUser!, req.body.url);
			socketIO.user(req.apiUser!, 'canvas', 'set-url', validURL);
			api.success(res, { valid: isValid, url: validURL });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/canvas/events', jwt.requireLoggedIn, async (req, res) => {
		try {
			const responseObj = await feeds.canvasCacheRetry(db, req.apiUser!);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/canvas/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			const responseObj = await canvas.getClasses(db, req.apiUser!);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/canvas/unique-events', jwt.requireScope('faculty'), async (req, res) => {
		try {
			const events = await canvas.getUniqueEvents(db);
			api.success(res, { events });
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;

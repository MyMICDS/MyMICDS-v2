import { AddClassParameters, DeleteClassParameters } from '@mymicds/sdk';
import { assertType } from 'typescript-is';
import * as api from '../libs/api';
import * as classes from '../libs/classes';
import * as jwt from '../libs/jwt';
import RoutesFunction from './routesFunction';

export default ((app, db, socketIO) => {

	app.get('/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			const classResult = await classes.get(db, req.apiUser!);
			api.success(res, { classes: classResult });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertType<AddClassParameters>(req.body);
		} catch (err) {
			api.error(res, err);
			return;
		}

		const user = req.apiUser;
		const scheduleClass = {
			_id: req.body.id,
			name: req.body.name,
			color: req.body.color,
			block: req.body.block,
			type: req.body.type,
			teacher: {
				prefix: req.body.teacherPrefix,
				firstName: req.body.teacherFirstName,
				lastName: req.body.teacherLastName
			}
		};

		try {
			const classResult = await classes.upsert(db, user!, scheduleClass);
			api.success(res, { id: classResult ? classResult._id : null });
			socketIO.user(req.apiUser!, 'classes', 'add', scheduleClass);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.delete('/classes', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertType<DeleteClassParameters>(req.body);
			await classes.delete(db, req.apiUser!, req.body.id);
			socketIO.user(req.apiUser!, 'classes', 'delete', req.body.id);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;

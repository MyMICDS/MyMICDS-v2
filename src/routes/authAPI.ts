import { assertType } from 'typescript-is';
import {
	ChangePasswordParameters,
	ConfirmParameters,
	ForgotPasswordParameters,
	LoginParameters,
	RegisterParameters,
	ResetPasswordParameters
} from '@mymicds/sdk';
import * as api from '../libs/api';
import * as auth from '../libs/auth';
import * as jwt from '../libs/jwt';
import * as passwords from '../libs/passwords';
import RoutesFunction from './routesFunction';

export default ((app, db) => {
	app.post('/auth/login', async (req, res) => {
		if (req.user) {
			api.success(res, {
				success: true,
				message: "You're already logged in, silly!",
				jwt: null
			});
			return;
		}

		const rememberMe = typeof req.body.remember !== 'undefined';

		try {
			assertType<LoginParameters>(req.body);

			const responseObj = await auth.login(
				db,
				req.body.user,
				req.body.password,
				rememberMe,
				req.body.comment
			);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/logout', jwt.requireLoggedIn, async (req, res) => {
		// Since you must be logged in to log out, there's always going to be a token
		const token = req.headers.authorization!.slice(7);

		try {
			await jwt.revoke(db, req.user as jwt.UserPayload, token);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/register', async (req, res) => {
		try {
			assertType<RegisterParameters>(req.body);
		} catch (err) {
			api.error(res, err);
			return;
		}

		const user: auth.NewUserData = {
			user: req.body.user,
			password: req.body.password,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			gradYear: parseInt(req.body.gradYear, 10)
		};

		if (typeof req.body.teacher !== 'undefined' && req.body.teacher !== false) {
			user.gradYear = null;
		}

		try {
			await auth.register(db, user);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/confirm', async (req, res) => {
		try {
			assertType<ConfirmParameters>(req.body);
			await auth.confirm(db, req.body.user, req.body.hash);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/auth/change-password', jwt.requireLoggedIn, async (req, res) => {
		try {
			assertType<ChangePasswordParameters>(req.body);
			await passwords.changePassword(
				db,
				req.apiUser!,
				req.body.oldPassword,
				req.body.newPassword
			);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/forgot-password', async (req, res) => {
		if (req.apiUser) {
			api.error(res, 'You are already logged in, silly!');
			return;
		}
		try {
			assertType<ForgotPasswordParameters>(req.body);
			await passwords.resetPasswordEmail(db, req.body.user);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/auth/reset-password', async (req, res) => {
		if (req.apiUser) {
			api.error(res, 'You are already logged in, silly!');
			return;
		}
		try {
			assertType<ResetPasswordParameters>(req.body);
			await passwords.resetPassword(db, req.body.user, req.body.password, req.body.hash);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/auth/verify', jwt.requireLoggedIn, (req, res) => {
		api.success(res, {
			payload: req.user
		});
	});
}) as RoutesFunction;

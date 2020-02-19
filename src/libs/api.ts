import { Action } from '@mymicds/sdk';
import { NextFunction, Request, Response } from 'express';
import { TypeGuardError } from 'typescript-is';
import { InputError } from './errors';

declare global {
	namespace Express {
		interface Request {
			apiUser: string | null;
		}
	}
}

/**
 * Allows admins to perform an action on behalf of another user.
 * @param req Express request object.
 * @param res Express response object.
 * @param next Calls the next handler in the middleware chain.
 */
export function adminOverride(req: Request, res: Response, next: NextFunction) {
	req.apiUser = null;
	if (req.user) {
		req.apiUser = req.user.user;
		if (Object.keys(req.user.scopes).includes('admin')) {
			if (req.body.behalfOf) {
				req.apiUser = req.body.behalfOf;
			} else if (req.query.behalfOf) {
				req.apiUser = req.query.behalfOf;
			}
		}
	}

	next();
}

/**
 * Responds in the standard API response format.
 * @param res Express response object.
 * @param data Any data that the API should respond with.
 * @param action An action for the front-end client to perform.
 */
function respondSuccess(res: Response, data: any = {}, action: Action | null = null) {
	// Make sure it's a valid action
	if (action && !Object.values(Action).includes(action)) {
		action = null;
	}

	res.json({
		error: null,
		action,
		data
	});
}

/**
 * Responds in the standard API error format.
 * @param res Express response object.
 * @param error Error that the API should respond with.
 * @param action An action for the front-end client to perform.
 */
function respondError(res: Response, error: Error | string | null, action: Action | null = null) {
	// Check for different types of errors
	let err = null;
	if (error !== null && typeof error === 'object') {
		err = error.message;
	}
	if (typeof error === 'string') {
		err = error;
	}

	// Make sure it's a valid action
	if (action && !Object.values(Action).includes(action)) {
		action = null;
	}

	// Since it's an error, we gotta let the people know
	res.status(500);

	// If unauthorized, add proper HTTP header
	if ([Action.LOGIN_EXPIRED, Action.UNAUTHORIZED, Action.NOT_LOGGED_IN].includes(action!)) {
		res.status(401);
	}

	// If validation or other input error, use proper status code
	if (error instanceof TypeGuardError || error instanceof InputError) {
		res.status(400);
	}

	res.json({
		error: err,
		action,
		data: null
	});
}

export {
	respondSuccess as success,
	respondError as error
};

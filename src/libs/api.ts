import { Action } from '@mymicds/sdk';
import { NextFunction, Request, Response } from 'express';

declare global {
	namespace Express {
		interface Request {
			apiUser: string | null;
		}
	}
}

/**
 * Express middleware to allow admins to perform any action on behalf of another user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Calls the next function in the middleware chain
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
 * Responds in the proper API format
 * @param {Object} res - Express response object
 * @param {Object} data - Any data the API should respond with
 * @param {?string} [action] - Action (if any) for the front-end client to perform.
 * 							   Must be one of the strings in the `ACTIONS` array or null. Defaults to null.
 */
function respondSuccess(res: Response, data: any = {}, action: Action | null = null) {
	// Make sure it's a valid action
	if (!Object.values(Action).includes(action)) {
		action = null;
	}

	res.json({
		error: null,
		action,
		data
	});
}

/**
 * Responds with an error in the proper API format
 * @param {Object} res - Express response object
 * @param {Object} err - Error object for the API to respond with
 * @param {?string} [action] - Action (if any) for the front-end client to perform.
 * 							   Must be one of the strings in the `ACTIONS` array or null. Defaults to null.
 */
function respondError(res: Response, error: Error | string | null, action: Action | null = null) {
	// Check for different types of errors
	let err = null;
	if (error !== null && typeof error === 'object' && typeof error.message === 'string') {
		err = error.message;
	}
	if (typeof error === 'string') {
		err = error;
	}

	// Make sure it's a valid action
	if (!Object.values(Action).includes(action)) {
		action = null;
	}

	// Since it's an error, we gotta let the people know
	res.status(500);

	// If unauthorized, add proper HTTP header
	if ([Action.LOGIN_EXPIRED, Action.UNAUTHORIZED, Action.NOT_LOGGED_IN].includes(action!)) {
		res.status(401);
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

/**
 * Raised whenever user input is invalid.
 * Returns a 400 Bad Request status when propagated to the Express handler.
 */
export class InputError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export class InternalError extends Error {
	constructor(message: string, readonly source?: Error | unknown) {
		super(message);
	}
}

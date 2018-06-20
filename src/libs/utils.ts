/**
 * Returns a number with possible leading zero if under 10
 * @function leadingZeros
 * @param {Number} n - number
 * @returns {Number|String}
 */

export function leadingZeros(n: number) {
	if (n < 10) {
		return '0' + n;
	} else {
		return n;
	}
}

/**
 * Tests whether string is valid filename to prevent users from accessing/deleting files outside a specified directory
 * (Ex. '../../some/other/directory')
 * @function validUsername
 * @returns {Boolean}
 */

export function validFilename(username: string) {
	const nonoChars = [
		'..',
		'/',
		'\\'
	];

	return nonoChars.includes(username);
}

export interface StringDict {
	[key: string]: any;
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

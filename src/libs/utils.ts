import { TypeGuardError } from 'typia';

/**
 * Pads a number to two digits with a leading zero.
 * @param n An input number.
 * @returns The padded number (as a string if leading zero added).
 */
export function leadingZeros(n: number) {
	if (n < 10) {
		return `0${n}`;
	}
	return n;
}

/**
 * Tests whether a string is a valid filename.
 * Prevents users from accessing/deleting files outside a specified directory (`../../some/other/directory`).
 * @param filename The filename to check.
 */
export function validFilename(filename: string) {
	const nonoChars = ['..', '/', '\\'];

	return !nonoChars.includes(filename);
}

export interface StringDict {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = any> = new (...args: any[]) => T;

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export function shouldTextBeDark(color: string): boolean {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
	if (result) {
		const r = parseInt(result[1], 16);
		const g = parseInt(result[2], 16);
		const b = parseInt(result[3], 16);

		return r * 0.299 + g * 0.587 + b * 0.114 > 186.0;
	}
	return false;
}

// https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
export function stringToColor(str: string) {
	str = str.toLocaleLowerCase();
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	let colour = '#';
	for (let i = 0; i < 3; i++) {
		const value = (hash >> (i * 8)) & 0xff;
		colour += ('00' + value.toString(16)).substr(-2);
	}
	return colour;
}

export function humanizeTypiaErrorMessage(error: TypeGuardError) {
	if (error.path) {
		const parts = error.path.split('.');
		return `Expected ${parts[parts.length - 1]} to be ${error.expected}!`;
	}
	return `Expected to be ${error.expected}!`;
}

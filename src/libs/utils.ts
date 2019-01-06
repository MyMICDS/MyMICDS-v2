/**
 * Pads a number to two digits with a leading zero.
 * @param n An input number.
 * @returns The padded number (as a string if leading zero added).
 */
export function leadingZeros(n: number) {
	if (n < 10) {
		return '0' + n;
	} else {
		return n;
	}
}

/**
 * Tests whether a string is a valid filename.
 * Prevents users from accessing/deleting files outside a specified directory (`../../some/other/directory`).
 * @param filename The filename to check.
 */
export function validFilename(filename: string) {
	const nonoChars = [
		'..',
		'/',
		'\\'
	];

	return !nonoChars.includes(filename);
}

export interface StringDict {
	[key: string]: any;
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

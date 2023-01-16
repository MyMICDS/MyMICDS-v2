import { InternalError } from './errors';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Hashes a password.
 * @param password Password to hash.
 * @returns The hashed pasword.
 */
export async function hashPassword(password: string) {
	try {
		return await bcrypt.hash(password, 10);
	} catch (e) {
		throw new InternalError('There was a problem hashing the password!', e as Error);
	}
}

/**
 * Safely compares two strings to avoid timing attacks.
 * @param a Raw string (user input).
 * @param b Comparison string (database string).
 * @returns Whether the strings match.
 */
export function safeCompare(a: string, b: string) {
	let mismatch = a.length === b.length ? 0 : 1;
	if (mismatch) {
		b = a;
	}

	// NOTE: I don't think this can be converted to an ES6 for..of, so I'm keeping it as is.
	for (let i = 0; i < a.length; ++i) {
		const ac = a.charCodeAt(i);
		const bc = b.charCodeAt(i);
		mismatch |= ac ^ bc;
	}

	return mismatch === 0;
}

/**
 * Creates a SHA-256 hash of a string.
 * @param str String to hash.
 * @returns The SHA-256 hash for the string.
 */
export function shaHash(str: string) {
	return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Safely compares a plaintext string and a SHA-256 hash.
 * @param str Plaintext string.
 * @param hash SHA-256 hash.
 * @returns Whether the strings match.
 */
export function safeCompareSHA(str: string, hash: string) {
	const hashedStr = shaHash(str);
	return safeCompare(hashedStr, hash);
}

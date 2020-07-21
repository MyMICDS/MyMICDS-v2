import { Db } from 'mongodb';
import { Scope } from '@mymicds/sdk';
import * as cryptoUtils from './cryptoUtils';
import * as users from './users';

/**
 * Unsubscribes a user from a certain set of emails.
 * @param db Database connection.
 * @param user Username.
 * @param hash Unsubscription hash.
 * @param scopes Scope(s) to unsubscribe from.
 */
export async function unsubscribe(
	db: Db,
	user: string,
	hash: string | true,
	scopes: Scope | Scope[]
) {
	if (typeof scopes === 'string') {
		scopes = [scopes];
	}

	// Make sure valid user and get user id
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new Error("User doesn't exist!");
	}

	const dbHash = userDoc!.unsubscribeHash;

	if (hash === true || cryptoUtils.safeCompare(hash, dbHash)) {
		// Hash matches, unsubscribe account!
		const userdata = db.collection('users');

		try {
			await userdata.updateOne({ user }, { $addToSet: { unsubscribed: { $each: scopes } } });
		} catch (e) {
			throw new Error('There was a problem updating the database!');
		}
	} else {
		// Hash does not match
		throw new Error('Hash not valid!');
	}
}

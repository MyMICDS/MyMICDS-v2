import { Db } from 'mongodb';
import * as cryptoUtils from '../../src/libs/cryptoUtils';
import { UserDoc } from '../../src/libs/users';

export const testUserDefaults = {
	user: 'test',
	password: 'test',
	firstName: 'Test',
	lastName: 'User',
	gradYear: 2020,
	confirmed: true,
	registered: new Date(),
	confirmationHash: 'asdf',
	scopes: [],
	unsubscribeHash: 'asdf'
};

export async function saveTestUser(db: Db, params: Partial<UserDoc> = {}): Promise<UserDoc> {
	const saveUser = Object.assign({}, testUserDefaults, params);
	saveUser.password = await cryptoUtils.hashPassword(saveUser.password);

	const res = await db.collection('users').insertOne(saveUser);
	return res.ops[0];
}

import { Db } from 'mongodb';
import * as cryptoUtils from '../../src/libs/cryptoUtils';
import * as jwt from '../../src/libs/jwt';
import { UserDoc } from '../../src/libs/users';

export const testUser = {
	user: 'test',
	password: 'test',
	firstName: 'Test',
	lastName: 'User',
	gradYear: 2021,
	confirmed: true,
	registered: new Date(),
	confirmationHash: 'asdf',
	scopes: [],
	unsubscribeHash: 'asdf'
};

export async function saveTestUser(db: Db, params: Partial<UserDoc> = {}) {
	const saveUser = Object.assign({}, testUser, params);
	saveUser.password = await cryptoUtils.hashPassword(saveUser.password);

	const res = await db.collection('users').insertOne(saveUser);
	return res.ops[0] as UserDoc;
}

export async function generateJWT(db: Db) {
	return await jwt.generate(db, testUser.user, false, 'test JWT');
}

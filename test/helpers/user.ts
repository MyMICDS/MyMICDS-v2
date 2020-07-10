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

export async function saveTestUser(db: Db, params: Partial<UserDoc> = {}): Promise<UserDoc> {
	const saveUser = Object.assign({}, testUser, params);
	saveUser.password = await cryptoUtils.hashPassword(saveUser.password);

	const res = await db.collection('users').insertOne(saveUser);
	return res.ops[0];
}

export async function generateJWT(db: Db): Promise<string> {
	return await jwt.generate(db, testUser.user, false, 'test JWT');
}

import { Block, ClassType, MyMICDSClass } from '@mymicds/sdk';
import { Db } from 'mongodb';
import * as classes from '../../src/libs/classes';
import { testUser } from './user';

export const testClass = {
	name: 'test class',
	color: '#1760D6',
	block: Block.A,
	type: ClassType.MANDARIN,
	teacher: {
		prefix: 'Mr.',
		firstName: 'asdf',
		lastName: 'asdf'
	}
};

export async function saveTestClass(db: Db, params: Partial<MyMICDSClass> = {}) {
	const saveClass = Object.assign({}, testClass, params);

	return await classes.upsert(db, testUser.user, saveClass);
}

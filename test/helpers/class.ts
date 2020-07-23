import { Block, ClassType, MyMICDSClass } from '@mymicds/sdk';
import { Db } from 'mongodb';
import { testUser } from './user';
import * as classes from '../../src/libs/classes';

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

	return classes.upsert(db, testUser.user, saveClass);
}

import { expect } from 'chai';
import { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as users from '../src/libs/users';

describe('Auth', () => {
	let mongo: MongoMemoryServer;
	let db: Db;
	let request: ReturnType<typeof supertest>;

	before(async () => {
		mongo = new MongoMemoryServer();
		const [app, _db] = await initAPI(await mongo.getUri());
		db = _db;
		request = supertest(app);
	});

	describe('POST /auth/register', () => {
		const payload = {
			user: 'test',
			password: 'Hunter2',
			firstName: 'Test',
			lastName: 'User',
			gradYear: 2020
		};
		const route = '/auth/register';

		it('creates a user', async () => {
			await request.post(route).send(payload).expect(200);

			const { isUser, userDoc } = await users.get(db, 'test');
			expect(isUser).to.be.true;
			expect(userDoc).to.be.not.null;
			expect(userDoc).to.have.property('confirmationHash').that.is.a('string');
		});

		it('validates parameter types', async () => {
			for (const key of Object.keys(payload)) {
				const evilPayload = JSON.parse(JSON.stringify(payload));
				evilPayload[key] = false;
				const res = await request.post(route).send(evilPayload).expect(400);
				expect(res.body.error).to.include(key);
			}
		});
	});

	after(async () => {
		await mongo.stop();
	});
});

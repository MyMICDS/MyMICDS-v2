import { expect } from 'chai';
import * as jwt from 'jsonwebtoken';
import { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import _ from 'underscore';
import { initAPI } from '../src/init';
import config from '../src/libs/config';
import * as users from '../src/libs/users';
import { saveTestUser, testUserDefaults } from './helpers/user';
import { TestRequest, validateParameters } from './shared';

describe('Auth', () => {
	let mongo: MongoMemoryServer;
	let db: Db;
	let request: TestRequest;

	before(async () => {
		mongo = new MongoMemoryServer();
		const [app, _db] = await initAPI(await mongo.getUri());
		db = _db;
		request = supertest(app);
	});

	afterEach(async () => {
		await db.dropDatabase();
	});

	describe('POST /auth/register', () => {
		const payload = _.pick(testUserDefaults, ['user', 'password', 'firstName', 'lastName', 'gradYear']);

		it('creates a user', async () => {

			await request.post('/auth/register').send(payload).expect(200);

			const { isUser, userDoc } = await users.get(db, 'test');
			expect(isUser).to.be.true;
			expect(userDoc).to.be.not.null;
			expect(userDoc).to.have.property('confirmationHash').that.is.a('string');
		});

		validateParameters(() => request, 'post', '/auth/register', payload);
	});

	describe('POST /auth/confirm', () => {
		const payload = {
			user: testUserDefaults.user,
			hash: testUserDefaults.confirmationHash
		};

		it('confirms a user', async () => {
			await saveTestUser(db);

			await request.post('/auth/confirm').send(payload).expect(200);

			const { userDoc: newDoc } = await users.get(db, testUserDefaults.user);
			expect(newDoc).to.have.property('confirmed').that.equals(true);
		});

		validateParameters(() => request, 'post', '/auth/confirm', payload);
	});

	describe('POST /auth/login', () => {
		const payload = _.pick(testUserDefaults, ['user', 'password']);

		it('creates a valid JWT', async () => {
			await saveTestUser(db);

			const res = await request.post('/auth/login').send(payload).expect(200);

			expect(res.body).to.have.property('data').which.has.property('jwt').that.is.a('string');

			const jwtPayload = jwt.verify(res.body.data.jwt, config.jwt.secret);

			expect(jwtPayload).to.have.property('user').that.equals(testUserDefaults.user);
			expect(jwtPayload).to.have.property('scopes').that.deep.equals({ pleb: true });
		});

		validateParameters(() => request, 'post', '/auth/login', payload);
	});

	after(async () => {
		await mongo.stop();
	});
});

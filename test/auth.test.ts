import { buildRequest, requireLoggedIn, validateParameters } from './helpers/shared';
import { expect } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as jwtLib from 'jsonwebtoken';
import * as passwords from '../src/libs/passwords';
import * as users from '../src/libs/users';
import _ from 'lodash';
import config from '../src/libs/config';
import supertest from 'supertest';

describe('Auth', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function () {
		await this.db.dropDatabase();
	});

	describe('POST /auth/register', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/auth/register';
		const payload = _.pick(testUser, ['user', 'password', 'firstName', 'lastName', 'gradYear']);

		const teacherPayload = {
			...payload,
			gradYear: null,
			teacher: true
		};

		it('creates a user', async function () {
			await buildRequest(this).send(payload).expect(200);

			const { isUser, userDoc } = await users.get(this.db, 'test');
			expect(isUser).to.be.true;
			expect(userDoc).to.be.not.null;
			expect(userDoc).to.have.property('confirmationHash').that.is.a('string');
		});

		it('creates a teacher', async function () {
			await buildRequest(this).send(teacherPayload).expect(200);

			const { isUser, userDoc } = await users.get(this.db, 'test');
			expect(isUser).to.be.true;
			expect(userDoc).to.be.not.null;
			expect(userDoc).to.have.property('confirmationHash').that.is.a('string');
			expect(userDoc).to.have.property('gradYear').that.is.null;
		});

		it('rejects blacklisted passwords', async function () {
			for (const password of passwords.passwordBlacklist) {
				const badPayload = {
					...payload,
					password
				};

				await buildRequest(this).send(badPayload).expect(400);
			}
		});

		it('rejects already existing users', async function () {
			await saveTestUser(this.db);

			await buildRequest(this).send(payload).expect(400);
		});

		validateParameters(payload);
	});

	describe('POST /auth/confirm', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/auth/confirm';
		const payload = {
			user: testUser.user,
			hash: testUser.confirmationHash
		};

		it('confirms a user', async function () {
			await saveTestUser(this.db);

			await buildRequest(this).send(payload).expect(200);

			const { userDoc: newDoc } = await users.get(this.db, testUser.user);
			expect(newDoc).to.have.property('confirmed').that.equals(true);
		});

		it('rejects a bad hash', async function () {
			await saveTestUser(this.db);

			const badPayload = {
				...payload,
				hash: 'evil hash'
			};

			await buildRequest(this).send(badPayload).expect(400);
		});

		validateParameters(payload);
	});

	describe('POST /auth/login', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/auth/login';
		const payload = _.pick(testUser, ['user', 'password']);

		it('creates a valid JWT', async function () {
			await saveTestUser(this.db);

			const res = await buildRequest(this).send(payload).expect(200);

			expect(res.body.data).to.have.property('success').that.is.true;
			expect(res.body.data).to.have.property('jwt').that.is.a('string');

			const jwtSecret = await config.jwt.secret;
			if (typeof jwtSecret !== 'string') throw new Error('Invalid JWT secret!');
			const jwtPayload = jwtLib.verify(res.body.data.jwt, jwtSecret);

			expect(jwtPayload).to.have.property('user').that.equals(testUser.user);
			expect(jwtPayload).to.have.property('scopes').that.deep.equals({ pleb: true });
		});

		it('rejects an incorrect password', async function () {
			await saveTestUser(this.db);

			const badPayload = {
				...payload,
				password: 'incorrect password'
			};

			const res = await buildRequest(this).send(badPayload).expect(200);

			expect(res.body.data).to.have.property('success').that.is.false;
			expect(res.body.data).to.have.property('jwt').that.is.null;
		});

		validateParameters(payload, false);
	});

	describe('POST /auth/logout', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/auth/logout';

		it('invalidates the JWT', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			// Shouldn't be able to use it again now, route doesn't matter
			await this.request.post('/').set('Authorization', `Bearer ${jwt}`).expect(401);
		});

		requireLoggedIn();
	});

	describe('PUT /auth/change-password', function () {
		this.ctx.method = 'put';
		this.ctx.route = '/auth/change-password';
		const payload = {
			oldPassword: testUser.password,
			newPassword: 'new different password'
		};

		it('changes the user password', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(payload)
				.expect(200);

			const { matches } = await passwords.passwordMatches(
				this.db,
				testUser.user,
				payload.newPassword
			);
			expect(matches).to.be.true;
		});

		it('rejects an incorrect password', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const badPayload = {
				...payload,
				oldPassword: 'incorrect'
			};

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(badPayload)
				.expect(400);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	describe('POST /auth/forgot-password', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/auth/forgot-password';
		const payload = _.pick(testUser, 'user');

		it('sets a forgot password hash', async function () {
			await saveTestUser(this.db);

			await buildRequest(this).send(payload).expect(200);

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('passwordChangeHash').that.is.a('string');
		});

		validateParameters(payload, false);
	});

	describe('PUT /auth/reset-password', function () {
		this.ctx.method = 'put';
		this.ctx.route = '/auth/reset-password';

		const payload = {
			user: testUser.user,
			password: 'new password',
			hash: 'random bytes'
		};

		it("resets the user's password", async function () {
			await saveTestUser(this.db, { passwordChangeHash: 'random bytes' });

			await buildRequest(this).send(payload).expect(200);

			const { matches } = await passwords.passwordMatches(
				this.db,
				testUser.user,
				payload.password
			);
			expect(matches).to.be.true;
		});

		it('rejects a bad hash', async function () {
			await saveTestUser(this.db, { passwordChangeHash: 'random bytes' });

			const badPayload = {
				...payload,
				hash: 'evil hash'
			};

			await buildRequest(this).send(badPayload).expect(400);
		});

		validateParameters(payload, false);
	});

	describe('GET /auth/verify', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/auth/verify';

		it('verifies a JWT', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).expect(401);
			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data)
				.to.have.property('payload')
				.that.deep.equals({ user: testUser.user, scopes: { pleb: true } });
		});

		requireLoggedIn();
	});

	after(async function () {
		await this.mongo.stop();
	});
});

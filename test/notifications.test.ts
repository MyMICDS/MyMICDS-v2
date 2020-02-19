import { Scope } from '@mymicds/sdk';
import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as users from '../src/libs/users';
import { buildRequest, validateParameters } from './helpers/shared';
import { generateJWT, saveTestUser, testUser } from './helpers/user';

describe('Notifications', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('POST /notifications/unsubscribe', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/notifications/unsubscribe';

		const payload = {
			scopes: Scope.ALL
		};

		const multiplePayload = {
			scopes: [Scope.ANNOUNCEMENTS, Scope.FEATURES]
		};

		const anonPayload = {
			user: testUser.user,
			hash: testUser.unsubscribeHash,
			...payload
		};

		const anonMultiplePayload = {
			user: testUser.user,
			hash: testUser.unsubscribeHash,
			...multiplePayload
		};

		it('unsubscribes the user from a notification type', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('unsubscribed').that.deep.equals([payload.scopes]);
		});

		it('unsubscribes the user from multiple notification types', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(multiplePayload).expect(200);

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('unsubscribed').that.deep.equals(multiplePayload.scopes);
		});

		it('anonymously unsubscribes the user from a notification type', async function() {
			await saveTestUser(this.db);

			await buildRequest(this).send(anonPayload).expect(200);

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('unsubscribed').that.deep.equals([anonPayload.scopes]);
		});

		it('anonymously unsubscribes the user from multiple notification types', async function() {
			await saveTestUser(this.db);

			await buildRequest(this).send(anonMultiplePayload).expect(200);

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('unsubscribed').that.deep.equals(anonMultiplePayload.scopes);
		});

		validateParameters(payload);
		validateParameters(anonPayload, false);
	});

	after(async function() {
		await this.mongo.stop();
	});
});

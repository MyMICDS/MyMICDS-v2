import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as users from '../src/libs/users';
import config from './config';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { buildRequest, requireLoggedIn, validateParameters } from './shared';

describe('Portal', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('POST /portal/url/test-classes', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/portal/url/test-classes';

		const payload = {
			url: config.portal.classesURL
		};

		it('validates a classes calendar URL', async function() {
			const res = await buildRequest(this).send(payload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.true;
			expect(res.body.data).to.have.property('url').that.is.a('string')
				.and.satisfies((u: string) => u.startsWith('https')); // should turn webcal links to https
		});

		it('rejects an invalid URL', async function() {
			const badPayload = {
				url: 'not a good url'
			};

			await buildRequest(this).send(badPayload).expect(400);
		});

		validateParameters(payload);
	});

	describe('POST /portal/url/test-calendar', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/portal/url/test-calendar';

		const payload = {
			url: config.portal.calendarURL
		};

		it('validates a my calendar URL', async function() {
			const res = await buildRequest(this).send(payload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.true;
			expect(res.body.data).to.have.property('url').that.is.a('string')
				.and.satisfies((u: string) => u.startsWith('https')); // should turn webcal links to https
		});

		it('rejects an invalid URL', async function() {
			const badPayload = {
				url: 'not a good url'
			};

			await buildRequest(this).send(badPayload).expect(400);
		});

		it('rejects a classes URL', async function() {
			const badPayload = {
				url: config.portal.classesURL
			};

			const res = await buildRequest(this).send(badPayload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.a('string');
			expect(res.body.data).to.have.property('url').that.is.null;
		});

		validateParameters(payload);
	});

	describe('PUT /portal/url/classes', function() {
		this.ctx.method = 'put';
		this.ctx.route = '/portal/url/classes';

		const payload = {
			url: config.portal.classesURL
		};

		it('saves a classes calendar URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.true;
			expect(res.body.data).to.have.property('url').that.is.a('string')
				.and.satisfies((u: string) => u.startsWith('https')); // should turn webcal links to https

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('portalURLClasses').that.equals(
				config.portal.classesURL.replace('webcal', 'https')
			);
		});

		it('rejects an invalid URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const badPayload = {
				url: 'not a good url'
			};

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(badPayload).expect(400);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	describe('PUT /portal/url/calendar', function() {
		this.ctx.method = 'put';
		this.ctx.route = '/portal/url/calendar';

		const payload = {
			url: config.portal.calendarURL
		};

		it('saves a my calendar URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.true;
			expect(res.body.data).to.have.property('url').that.is.a('string')
				.and.satisfies((u: string) => u.startsWith('https')); // should turn webcal links to https

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('portalURLCalendar').that.equals(
				config.portal.calendarURL.replace('webcal', 'https')
			);
		});

		it('rejects an invalid URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const badPayload = {
				url: 'not a good url'
			};

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(badPayload).expect(400);
		});

		it('rejects a classes URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const badPayload = {
				url: config.portal.classesURL
			};

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(badPayload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.a('string');
			expect(res.body.data).to.have.property('url').that.is.null;
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	// TODO: rest of routes

	after(async function() {
		await this.mongo.stop();
	});
});

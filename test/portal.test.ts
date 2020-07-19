import { buildRequest, requireLoggedIn, validateParameters } from './helpers/shared';
import { expect } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { GetPortalDayRotationResponse } from '@mymicds/sdk';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as calServer from './calendars/server';
import * as users from '../src/libs/users';
import _ from 'lodash';
import config from './config';
import supertest from 'supertest';

describe('Portal', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
		await calServer.start();
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

		// TODO: Re-enable when normal school resumes (broke during COVID-19)
		xit('rejects a classes URL', async function() {
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

		// TODO: Re-enable when normal school resumes (broke during COVID-19)
		xit('rejects a classes URL', async function() {
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

	describe('GET /portal/classes', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/portal/classes';

		it('gets user Portal classes', async function() {
			await saveTestUser(this.db, { portalURLClasses: `http://localhost:${calServer.port}/portalClasses.ics` });
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);
			expect(res.body.data).to.have.property('hasURL').that.is.true;
			expect(res.body.data).to.have.property('classes').to.have.members(_.range(1, 6).map(n => `Test Class ${n}`));
		});

		requireLoggedIn();
	});

	describe('GET /portal/day-rotation', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/portal/day-rotation';

		it('gets all the day rotations', async function() {
			const res = await buildRequest(this).expect(200);

			expect(res.body.data).to.have.property('days').that.is.an('object');

			for (const [year, months] of Object.entries(res.body.data.days as GetPortalDayRotationResponse['days'])) {
				expect(parseInt(year, 10)).to.not.be.NaN;

				for (const [month, days] of Object.entries(months)) {
					expect(parseInt(month, 10)).to.not.be.NaN;

					for (const [day, rotation] of Object.entries(days)) {
						expect(parseInt(day, 10)).to.not.be.NaN;
						expect(rotation).to.be.within(1, 6);
					}
				}
			}
		});
	});

	after(async function() {
		await this.mongo.stop();
		await calServer.stop();
	});
});

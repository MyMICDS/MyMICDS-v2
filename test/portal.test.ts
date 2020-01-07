import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import config from './config';
import { buildRequest, validateParameters } from './shared';

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

		validateParameters(payload);
	});

	// TODO: rest of routes

	after(async function() {
		await this.mongo.stop();
	});
});

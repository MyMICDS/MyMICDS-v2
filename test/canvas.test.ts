import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import config from './config';
import { buildRequest, validateParameters } from './shared';

describe('Canvas', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('POST /canvas/test', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/canvas/test';

		const payload = {
			url: config.canvasURL
		};

		it('validates a calendar URL', async function() {
			const res = await buildRequest(this).send(payload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.true;
			expect(res.body.data).to.have.property('url').that.is.a('string')
				.and.satisfies((u: string) => u.startsWith('https')); // should turn webcal links to https
		});

		it('rejects an invalid URL', async function() {
			const badPayload = {
				url: 'not a good url'
			};

			const res = await buildRequest(this).send(badPayload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.a('string');
			expect(res.body.data).to.have.property('url').that.is.null;
		});

		validateParameters(payload);
	});

	// TODO: rest of routes

	after(async function() {
		await this.mongo.stop();
	});
});

import { AliasType } from '@mymicds/sdk';
import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import { ObjectID } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as aliases from '../src/libs/aliases';
import * as users from '../src/libs/users';
import * as calServer from './calendars/server';
import config from './config';
import { saveTestClass } from './helpers/class';
import { buildRequest, requireLoggedIn, validateParameters } from './helpers/shared';
import { generateJWT, saveTestUser, testUser } from './helpers/user';

use(chaiSubset);

describe('Canvas', () => {
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

	describe('PUT /canvas/url', function() {
		this.ctx.method = 'put';
		this.ctx.route = '/canvas/url';

		const payload = {
			url: config.canvasURL
		};

		it('saves a calendar URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.true;
			expect(res.body.data).to.have.property('url').that.is.a('string')
				.and.satisfies((u: string) => u.startsWith('https')); // should turn webcal links to https

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.have.property('canvasURL').that.equals(config.canvasURL);
		});

		it('rejects an invalid URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const badPayload = {
				url: 'not a good url'
			};

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(badPayload).expect(200);
			expect(res.body.data).to.have.property('valid').that.is.a('string');
			expect(res.body.data).to.have.property('url').that.is.null;

			const { userDoc } = await users.get(this.db, testUser.user);
			expect(userDoc).to.not.have.property('canvasURL');
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	describe('GET /canvas/events', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/canvas/events';

		it('gets user Canvas events', async function() {
			await saveTestUser(this.db, { canvasURL: `http://localhost:${calServer.port}/canvas.ics` });
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);
			expect(res.body.data).to.have.property('hasURL').that.is.true;
			expect(res.body.data).to.have.property('events').that.containSubset([
				{ title: 'Test Event 1, Class 1', class: { name: 'TS001:AA' } },
				{ title: 'Test Event 1, Class 2', class: { name: 'TS002:BB' } },
				{ title: 'Test Event 2, Class 2', class: { name: 'TS002:BB' } }
			]);
		});

		it('gets user Canvas events with aliases', async function() {
			await saveTestUser(this.db, { canvasURL: `http://localhost:${calServer.port}/canvas.ics` });
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db, { name: 'alias class' });
			await aliases.add(this.db, testUser.user, AliasType.CANVAS, 'TS002:BB', (_id as ObjectID).toHexString());

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);
			expect(res.body.data).to.have.property('hasURL').that.is.true;
			expect(res.body.data).to.have.property('events').that.containSubset([
				{ title: 'Test Event 1, Class 1', class: { name: 'TS001:AA' } },
				{ title: 'Test Event 1, Class 2', class: { name: 'alias class' } },
				{ title: 'Test Event 2, Class 2', class: { name: 'alias class' } }
			]);
		});

		requireLoggedIn();
	});

	describe('GET /canvas/classes', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/canvas/classes';

		it('gets user Canvas classes', async function() {
			await saveTestUser(this.db, { canvasURL: `http://localhost:${calServer.port}/canvas.ics` });
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);
			expect(res.body.data).to.have.property('hasURL').that.is.true;
			expect(res.body.data).to.have.property('classes').that.deep.equals([
				'TS001:AA',
				'TS002:BB'
			]);
		});

		requireLoggedIn();
	});

	after(async function() {
		await this.mongo.stop();
		await calServer.stop();
	});
});

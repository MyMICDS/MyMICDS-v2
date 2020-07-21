import { buildRequest, requireLoggedIn, validateParameters } from './helpers/shared';
import { expect, use } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as stickynotes from '../src/libs/stickynotes';
import _ from 'lodash';
import chaiSubset from 'chai-subset';
import supertest from 'supertest';

use(chaiSubset);

const testStickynote = {
	moduleId: 'technically an object ID',
	text: 'test text'
};

describe('Quotes', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	describe('GET /stickynotes', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/stickynotes';

		const payload = _.pick(testStickynote, 'moduleId');

		it('gets a user stickynote', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const {
				upsertedId: { _id }
			} = await stickynotes.post(
				this.db,
				testUser.user,
				testStickynote.moduleId,
				testStickynote.text
			);

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.query(payload)
				.expect(200);
			expect(res.body.data).to.have.property('_id').that.equals(_id.toHexString());
		});

		it('returns a new stickynote', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.query(payload)
				.expect(200);
			expect(res.body.data).to.be.a('string').that.is.empty;
		});

		requireLoggedIn();
	});

	describe('PUT /stickynotes', function () {
		this.ctx.method = 'put';
		this.ctx.route = '/stickynotes';

		const payload = testStickynote;

		it('saves a stickynote', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(payload)
				.expect(200);

			const note = await stickynotes.get(this.db, testUser.user, testStickynote.moduleId);
			expect(note).to.containSubset(testStickynote);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	afterEach(async function () {
		await this.db.dropDatabase();
	});

	after(async function () {
		await this.mongo.stop();
	});
});

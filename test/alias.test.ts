import { AliasType } from '@mymicds/sdk';
import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import { ObjectID } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as aliases from '../src/libs/aliases';
import * as calServer from './calendars/server';
import { saveTestClass } from './helpers/class';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { buildRequest, requireLoggedIn, validateParameters } from './shared';

use(chaiSubset);

describe('Alias', () => {
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

	describe('POST /alias', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/alias';

		const payload = {
			type: '',
			classString: 'remote class name',
			classId: ''
		};

		it('saves an alias', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db);
			const idString = (_id as ObjectID).toHexString();
			payload.classId = idString;

			for (const type of Object.values(AliasType)) {
				payload.type = type;
				await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);

				const { classObject, hasAlias } = await aliases.getClass(this.db, testUser.user, type, payload.classString);
				expect(hasAlias).to.be.true;
				expect(classObject).to.have.property('_id').that.satisfies((i: ObjectID) => i.toHexString() === idString);
			}
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	describe('GET /alias', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/alias';

		it('lists user aliases', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id: classId } = await saveTestClass(this.db);
			const aliasId = await aliases.add(
				this.db,
				testUser.user,
				AliasType.CANVAS,
				'remote class',
				(classId as ObjectID).toHexString()
			);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data).to.have.property('aliases').that.containSubset({
				canvas: [{ _id: (aliasId as ObjectID).toHexString() }],
				portal: []
			});
		});

		requireLoggedIn();
	});

	describe('DELETE /alias', function() {
		this.ctx.method = 'delete';
		this.ctx.route = '/alias';

		const payload = {
			type: AliasType.CANVAS,
			id: ''
		};

		it('deletes an existing alias', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id: classId } = await saveTestClass(this.db);
			const aliasId = await aliases.add(
				this.db,
				testUser.user,
				AliasType.CANVAS,
				'remote class',
				(classId as ObjectID).toHexString()
			);

			payload.id = aliasId.toHexString();

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);

			const userAliases = await aliases.list(this.db, testUser.user);
			expect(userAliases.canvas).to.be.empty;
			expect(userAliases.portal).to.be.empty;
		});

		it('rejects an invalid id', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(400);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	after(async function() {
		await this.mongo.stop();
		await calServer.stop();
	});
});

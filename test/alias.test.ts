import { AliasType, ListAliasesResponse } from '@mymicds/sdk';
import { assertEquals } from 'typia';
import { buildRequest, requireLoggedIn, validateParameters } from './helpers/shared';
import { expect, use } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ObjectID } from 'mongodb';
import { saveTestClass } from './helpers/class';
import * as aliases from '../src/libs/aliases';
import * as calServer from './calendars/server';
import chaiSubset from 'chai-subset';
import supertest from 'supertest';

use(chaiSubset);

describe('Alias', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
		await calServer.start();
	});

	afterEach(async function () {
		await this.db.dropDatabase();
	});

	describe('POST /alias', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/alias';

		const payload = {
			type: '',
			classString: 'remote class name',
			classId: ''
		};

		it('saves an alias', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db);
			const idString = (_id as ObjectID).toHexString();
			payload.classId = idString;

			for (const type of Object.values(AliasType)) {
				payload.type = type;
				await buildRequest(this)
					.set('Authorization', `Bearer ${jwt}`)
					.send(payload)
					.expect(200);

				const { classObject, hasAlias } = await aliases.getClass(
					this.db,
					testUser.user,
					type,
					payload.classString
				);
				expect(hasAlias).to.be.true;
				expect(classObject)
					.to.have.property('_id')
					.that.satisfies((i: ObjectID) => i.toHexString() === idString);
			}
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	describe('GET /alias', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/alias';

		it('lists user aliases', async function () {
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
			assertEquals<ListAliasesResponse>(res.body.data);

			expect(res.body.data.aliases.canvas).to.have.lengthOf(1);
			expect(res.body.data.aliases.canvas[0]).to.containSubset({
				_id: aliasId.toHexString()
			});
		});

		requireLoggedIn();
	});

	describe('DELETE /alias', function () {
		this.ctx.method = 'delete';
		this.ctx.route = '/alias';

		const payload = {
			type: AliasType.CANVAS,
			id: ''
		};

		it('deletes an existing alias', async function () {
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

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(payload)
				.expect(200);

			const userAliases = await aliases.list(this.db, testUser.user);
			expect(userAliases.canvas).to.be.empty;
			expect(userAliases.portal).to.be.empty;
		});

		it('rejects an invalid id', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(payload)
				.expect(400);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	after(async function () {
		await this.mongo.stop();
		await calServer.stop();
	});
});

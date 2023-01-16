import { AliasType, Block } from '@mymicds/sdk';
import { buildRequest } from './helpers/shared';
import { defaultSchoolBlock } from '../src/libs/schedule';
import { expect, use } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ObjectId } from 'mongodb';
import { saveTestClass } from './helpers/class';
import * as aliases from '../src/libs/aliases';
import * as calServer from './calendars/server';
import chaiSubset from 'chai-subset';
import moment from 'moment';
import supertest from 'supertest';

use(chaiSubset);

describe('Schedule', () => {
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

	describe('GET /schedule', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/schedule';

		const payload = {
			year: 2021,
			month: 8,
			day: 23
		};

		it('gets default schedule', async function () {
			const momentDate = moment({ ...payload, month: payload.month - 1 });
			const res = await buildRequest(this).query(payload).expect(200);
			expect(res.body.data).to.deep.equal({
				hasURL: false,
				schedule: {
					day: 'E',
					special: false,
					classes: [
						{
							class: defaultSchoolBlock,
							start: momentDate.clone().hour(8).toISOString(),
							end: momentDate.clone().hour(15).minute(15).toISOString()
						}
					],
					allDay: []
				}
			});
		});

		it('gets schedule with no Portal URL', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.query(payload)
				.expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: false,
				schedule: {
					day: 'E',
					special: false,
					classes: [
						{ class: { name: 'Block E' } },
						{ class: { name: 'Block G' } },
						{ class: { name: 'Block A' } },
						{ class: { name: 'Block C' } }
					],
					allDay: []
				}
			});
		});

		it('gets schedule with no Portal URL and configured classes', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await saveTestClass(this.db, { name: 'e block class', block: Block.E });
			await saveTestClass(this.db, { name: 'g block class', block: Block.G });

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.query(payload)
				.expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: false,
				schedule: {
					day: 'E',
					special: false,
					classes: [
						{ class: { name: 'e block class' } },
						{ class: { name: 'g block class' } },
						{ class: { name: 'Block A' } },
						{ class: { name: 'Block C' } }
					],
					allDay: []
				}
			});
		});

		it('gets schedule from Portal URL', async function () {
			await saveTestUser(this.db, {
				portalURLClasses: `http://localhost:${calServer.port}/portalClasses.ics`
			});
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.query(payload)
				.expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: true,
				schedule: {
					day: 'E',
					special: false,
					classes: [
						{ class: { name: 'class e' } },
						{ class: { name: 'class g' } },
						{ class: { name: 'class a' } },
						{ class: { name: 'class c' } }
					],
					allDay: []
				}
			});
		});

		it('gets schedule from Portal URL with aliases', async function () {
			await saveTestUser(this.db, {
				portalURLClasses: `http://localhost:${calServer.port}/portalClasses.ics`
			});
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db, { name: 'alias class', block: Block.C });
			await aliases.add(
				this.db,
				testUser.user,
				AliasType.PORTAL,
				'class c',
				(_id as ObjectId).toHexString()
			);

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.query(payload)
				.expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: true,
				schedule: {
					day: 'E',
					special: false,
					classes: [
						{ class: { name: 'class e' } },
						{ class: { name: 'class g' } },
						{ class: { name: 'class a' } },
						{ class: { name: 'alias class' } }
					],
					allDay: []
				}
			});
		});
	});

	after(async function () {
		await this.mongo.stop();
		await calServer.stop();
	});
});

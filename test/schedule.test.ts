import { AliasType, Block } from '@mymicds/sdk';
import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import moment from 'moment';
import { ObjectID } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as aliases from '../src/libs/aliases';
import { defaultSchoolBlock } from '../src/libs/schedule';
import * as calServer from './calendars/server';
import { saveTestClass } from './helpers/class';
import { buildRequest } from './helpers/shared';
import { generateJWT, saveTestUser, testUser } from './helpers/user';

use(chaiSubset);

describe('Schedule', () => {
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

	describe('GET /schedule', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/schedule';

		const payload = {
			year: 2020,
			month: 2,
			day: 7
		};

		it('gets default schedule', async function() {
			const momentDate = moment({ ...payload, month: payload.month - 1 });
			const res = await buildRequest(this).query(payload).expect(200);
			expect(res.body.data).to.deep.equal({
				hasURL: false,
				schedule: {
					day: 6,
					special: false,
					classes: [{
						class: defaultSchoolBlock,
						start: momentDate.clone().hour(8).toISOString(),
						end: momentDate.clone().hour(15).minute(15).toISOString()
					}],
					allDay: []
				}
			});
		});

		it('gets schedule with no Portal URL', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).query(payload).expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: false,
				schedule: {
					day: 6,
					special: false,
					classes: [
						{ class: { name: 'Block B' } },
						{ class: { name: 'Block F' } },
						{ class: { name: 'Collaborative Work' } },
						{ class: { name: 'Activities' } },
						{ class: { name: 'Block D' } }
					],
					allDay: []
				}
			});
		});

		it('gets schedule with no Portal URL and configured classes', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await saveTestClass(this.db, { name: 'b block class', block: Block.B });
			await saveTestClass(this.db, { name: 'f block class', block: Block.F });

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).query(payload).expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: false,
				schedule: {
					day: 6,
					special: false,
					classes: [
						{ class: { name: 'b block class' } },
						{ class: { name: 'f block class' } },
						{ class: { name: 'Collaborative Work' } },
						{ class: { name: 'Activities' } },
						{ class: { name: 'Block D' } }
					],
					allDay: []
				}
			});
		});

		it('gets schedule from Portal URL', async function() {
			await saveTestUser(this.db, { portalURLClasses: `http://localhost:${calServer.port}/portalClasses.ics` });
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).query(payload).expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: true,
				schedule: {
					day: 6,
					special: false,
					classes: [
						{ class: { name: 'Test Class 1' } },
						{ class: { name: 'Test Class 5' } },
						{ class: { name: 'Test Class 3' } }
					],
					allDay: []
				}
			});
		});

		it('gets schedule from Portal URL with aliases', async function() {
			await saveTestUser(this.db, { portalURLClasses: `http://localhost:${calServer.port}/portalClasses.ics` });
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db, { name: 'alias class' });
			await aliases.add(this.db, testUser.user, AliasType.PORTAL, 'Test Class 1', (_id as ObjectID).toHexString());

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).query(payload).expect(200);
			expect(res.body.data).to.containSubset({
				hasURL: true,
				schedule: {
					day: 6,
					special: false,
					classes: [
						{ class: { name: 'alias class' } },
						{ class: { name: 'Test Class 5' } },
						{ class: { name: 'Test Class 3' } }
					],
					allDay: []
				}
			});
		});
	});

	after(async function() {
		await this.mongo.stop();
		await calServer.stop();
	});
});

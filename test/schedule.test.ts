import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import moment from 'moment';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import { defaultSchoolBlock } from '../src/libs/schedule';
import * as calServer from './calendars/server';
import { generateJWT, saveTestUser } from './helpers/user';
import { buildRequest } from './shared';

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

		// This must be changed every year to match with the day rotation.
		const payload = {
			year: 2020,
			month: 1,
			day: 13
		};

		const calendarPayload = {
			year: 2020,
			month: 1,
			day: 13
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

		it('gets schedule from Portal URL', async function() {
			await saveTestUser(this.db, { portalURLClasses: `http://localhost:${calServer.port}/portalClasses.ics` });
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).query(calendarPayload).expect(200);
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
	});

	after(async function() {
		await this.mongo.stop();
		await calServer.stop();
	});
});

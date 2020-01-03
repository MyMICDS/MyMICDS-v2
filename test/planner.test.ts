import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import moment from 'moment';
import { ObjectID } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import _ from 'underscore';
import { initAPI } from '../src/init';
import * as planner from '../src/libs/planner';
import { saveTestClass } from './helpers/class';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { buildRequest, requireLoggedIn, validateParameters } from './shared';

const testEvent = {
	title: 'test event',
	desc: 'this is a test event',
	start: moment().toDate(),
	end: moment().add(2, 'days').toDate()
};

const dateStringEvent = {
	..._.omit(testEvent, ['start', 'end']),
	start: testEvent.start.toISOString(),
	end: testEvent.end.toISOString()
};

use(chaiSubset);

describe('Planner', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('GET /planner', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/planner';

		it('gets user events', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await planner.upsert(this.db, testUser.user, _.clone(testEvent));

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data).to.have.property('events').that.is.an('array').with.lengthOf(1);
			expect(res.body.data.events[0]).to.containSubset(dateStringEvent);
		});

		requireLoggedIn();
	});

	describe('POST /planner', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/planner';

		const payload = _.clone(dateStringEvent);

		it('saves a classless event', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);
			expect(res.body.data).to.have.property('events').that.is.an('array').with.lengthOf(1);
			expect(res.body.data.events[0]).to.containSubset(dateStringEvent);

			const userEvents = await planner.get(this.db, testUser.user);
			expect(userEvents).to.be.an('array').with.lengthOf(1);
			expect(userEvents[0]).to.containSubset(testEvent);
		});

		it('saves an event with a class', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db);

			const classPayload = {
				...payload,
				classId: (_id as ObjectID).toHexString()
			};

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(classPayload).expect(200);
			expect(res.body.data).to.have.property('events').that.is.an('array').with.lengthOf(1);
			expect(res.body.data.events[0]).to.containSubset(dateStringEvent).and.have.property('class');

			const userEvents = await planner.get(this.db, testUser.user);
			expect(userEvents).to.be.an('array').with.lengthOf(1);
			expect(userEvents[0]).to.containSubset(testEvent).and.have.property('class');
		});

		it('modifies an existing event', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id } = await planner.upsert(this.db, testUser.user, testEvent);
			const idString = _id.toHexString();

			const updatePayload = {
				...payload,
				id: idString,
				title: 'updated title',
				desc: 'updated description'
			};

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(updatePayload).expect(200);
			expect(res.body.data).to.have.property('events').that.is.an('array').with.lengthOf(1);
			expect(res.body.data.events[0]).to.have.property('_id').that.equals(idString);

			const userEvents = await planner.get(this.db, testUser.user);
			expect(userEvents).to.be.an('array').with.lengthOf(1);
			expect(userEvents[0]).to.containSubset(_.pick(updatePayload, ['title', 'desc']));
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	describe('DELETE /planner', function() {
		this.ctx.method = 'delete';
		this.ctx.route = '/planner';

		const payload = {
			id: ''
		};

		it('deletes an existing event', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id } = await planner.upsert(this.db, testUser.user, testEvent);
			payload.id = _id.toHexString();

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);

			const userEvents = await planner.get(this.db, testUser.user);
			expect(userEvents).to.be.empty;
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	after(async function() {
		await this.mongo.stop();
	});
});

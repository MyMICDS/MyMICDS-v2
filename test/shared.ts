import { expect } from 'chai';
import { Context } from 'mocha';
import { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import _ from 'underscore';
import { generateJWT, saveTestUser } from './helpers/user';

declare global {
	interface Context {
		mongo: MongoMemoryServer;
		request: ReturnType<typeof supertest>;
		db: Db;
		method: 'get' | 'post' | 'put' | 'patch' | 'delete';
		route: string;
	}
}

export function buildRequest({ method, request, route }: Context) {
	return request[method](route);
}

export function requireLoggedIn() {
	it('requires the user to be logged in', async function() {
		await buildRequest(this).expect(401);
	});
}

export function validateParameters(payload: any, autoLogin = true) {
	it('validates parameter types', async function() {
		let jwt: string | null = null;
		if (autoLogin) {
			await saveTestUser(this.db);
			jwt = await generateJWT(this.db);
		}

		for (const key of Object.keys(payload)) {
			const evilPayload = _.clone(payload);
			evilPayload[key] = false;
			const res = await buildRequest(this)
				.set(jwt ? { Authorization: `Bearer ${jwt}` } : {})
				.send(evilPayload)
				.expect(400);
			expect(res.body.error).to.include(key);
		}
	});
}

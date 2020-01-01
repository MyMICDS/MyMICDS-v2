import { expect } from 'chai';
import supertest from 'supertest';
import _ from 'underscore';

export type TestRequest = ReturnType<typeof supertest>;

export function validateParameters(
	request: () => TestRequest,
	method: 'get' | 'post' | 'put' | 'patch' | 'delete',
	route: string,
	payload: any
) {
	it('validates parameter types', async () => {
		for (const key of Object.keys(payload)) {
			const evilPayload = _.clone(payload);
			evilPayload[key] = false;
			const res = await request()[method](route).send(evilPayload).expect(400);
			expect(res.body.error).to.include(key);
		}
	});
}

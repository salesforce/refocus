/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/utils/newRoom.js
 */

const expect = require('chai').expect;
const sinon = require('sinon');
//const request = require('superagent');
let request;

const uRoom = require('../../../../view/rooms/utils/newRoom.js');

describe('tests/view/rooms/utils/newRoom.js', () => {
	beforeEach(() => {
		request = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('ok, room already exists with name given', (done) => {
  	request.returns(Promise.resolve("aaa"));

    uRoom.checkIfRoomExistsFromName('doesNotExist')
    .then((res) => {
    	console.log(res);
    	done();
    })
  });

  it('ok, room does not exist with name given', () => {

  });

  it('ok, room created with parameters', () => {

  });
});

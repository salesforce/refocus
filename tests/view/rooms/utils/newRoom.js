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
const vUtils = require('../../../../view/utils.js');
const uRoom = require('../../../../view/rooms/utils/newRoom.js');

let getPromiseWithUrl;
let postPromiseWithUrl;

describe('tests/view/rooms/utils/newRoom.js', () => {
  beforeEach(() => {
    getPromiseWithUrl = sinon.stub(vUtils, 'getPromiseWithUrl');
    postPromiseWithUrl = sinon.stub(vUtils, 'postPromiseWithUrl');
  });

  afterEach(() => {
    getPromiseWithUrl.restore();
    postPromiseWithUrl.restore();
  });

  it('ok, room already exists with name given', (done) => {
    getPromiseWithUrl.resolves({ body: [{ name: 'room_name' }] });
    uRoom.checkIfRoomExistsFromName('roomExists')
    .then((res) => {
      expect(res).to.equal(true);
      done();
    });
  });

  it('ok, room does not exist with name given', (done) => {
    getPromiseWithUrl.resolves({ body: [] });
    uRoom.checkIfRoomExistsFromName('roomDoesNotExist')
    .then((res) => {
      expect(res).to.equal(false);
      done();
    });
  });

  it('ok, room created from parameters', (done) => {
    const room = { name: 'room_name', type: 'room_type' };
    postPromiseWithUrl.resolves(room);
    uRoom.createRoomFromParameters(room)
    .then((res) => {
      expect(res).to.equal(room);
      done();
    });
  });
});

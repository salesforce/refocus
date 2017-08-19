/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/roomType/delete.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const RoomType = tu.db.RoomType;

describe('tests/db/model/roomType/delete.js >', () => {
  beforeEach((done) => {
    RoomType.create(u.getStandard())
    .then((room) => {
      const room2 = u.getStandard();
      room2.name = 'TestRoomType';
      return RoomType.create(room2);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, Room Type deleted', (done) => {
    RoomType.destroy({ where: { name: u.name } })
    .then(() => RoomType.findAll())
    .then((o) => {
      expect(o.length).to.equal(1);
      expect(o[0].dataValues.name).to.equal('TestRoomType');
      done();
    })
    .catch(done);
  });
});

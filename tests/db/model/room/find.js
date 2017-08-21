/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/room/find.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const v = require('../roomType/utils');

describe('tests/db/model/room/find.js >', () => {
  beforeEach((done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Find room', () => {
    it('ok, room active', (done) => {
      Room.findOne({ where: { active: true } })
      .then((o) => {
        expect(o).to.have.property('name').to.equal(u.name);
        done();
      })
      .catch(done);
    });

    it('returns correct profile access field name', (done) => {
      expect(Room.getProfileAccessField()).to.equal('roomAccess');
      done();
    });
  });
});

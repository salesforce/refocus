/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/room/delete.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const v = require('../roomType/utils');

describe('tests/db/model/room/delete.js >', () => {
  beforeEach((done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      const room2 = u.getStandard();
      room2.type = room.type;
      room2.name = 'TestRoom';
      return Room.create(room2);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, Room deleted', (done) => {
    Room.destroy({ where: { name: u.name } })
    .then(() => Room.findAll())
    .then((o) => {
      expect(o.length).to.equal(1);
      expect(o[0].dataValues.name).to.equal('TestRoom');
      done();
    })
    .catch(done);
  });
});

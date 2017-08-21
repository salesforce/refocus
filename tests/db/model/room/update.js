/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/room/update.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const v = require('../roomType/utils');
const invalidValue = '^thisValueisAlwaysInvalid#';

describe('tests/db/model/room/update.js >', () => {
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

  it('ok, room active updated', (done) => {
    Room.findOne({ where: { name: u.name } })
    .then((o) => o.update({ active: false }))
    .then(() => Room.findOne({ where: { name: u.name } }))
    .then((o) => {
      expect(o).to.have.property('active').to.equal(false);
      done();
    })
    .catch(done);
  });

  it('ok, room name updated', (done) => {
    Room.findOne({ where: { name: u.name } })
    .then((o) => o.update({ name: 'RoomTest' }))
    .then(() => Room.findOne({ where: { name: 'RoomTest' } }))
    .then((o) => {
      expect(o).to.have.property('name').to.equal('RoomTest');
      done();
    })
    .catch(done);
  });

  it('fail, room name bad', (done) => {
    Room.findOne({ where: { name: u.name } })
    .then((o) => o.update({ name: invalidValue }))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
    .catch(done);
  });
});

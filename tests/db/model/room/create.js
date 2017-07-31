/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/room/create.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const v = require('../roomType/utils');
const invalidValue = '^thisValueisAlwaysInvalid#';

describe('db: room: create: ', () => {
  afterEach(u.forceDelete);

  describe('Create a new room', () => {
    it('ok, room created', (done) => {
      RoomType.create(v.getStandard())
      .then((roomType) => {
        const room = u.getStandard();
        room.type = roomType.id;
        return Room.create(room);
      })
      .then((o) => {
        expect(o).to.have.property('name');
        expect(o).to.have.property('active').to.equal(true);
        done();
      })
    .catch(done);
    });

    it('ok, room created settings default', (done) => {
      RoomType.create(v.getStandard())
      .then((roomType) => {
        const room = u.getStandard();
        room.type = roomType.id;
        return Room.create(room);
      })
      .then((o) => {
        expect(o).to.have.property('settings');
        expect(o.settings.Key1).to.equal('Value1');
        done();
      })
    .catch(done);
    });

    it('ok, room created active false', (done) => {
      RoomType.create(v.getStandard())
      .then((roomType) => {
        const room = u.getStandard();
        room.type = roomType.id;
        room.active = false;
        return Room.create(room);
      })
      .then((o) => {
        expect(o).to.have.property('name');
        expect(o).to.have.property('active').to.equal(false);
        done();
      })
    .catch(done);
    });

    it('fail, room name invalid', (done) => {
      RoomType.create(v.getStandard())
      .then((roomType) => {
        const room = u.getStandard();
        room.name = invalidValue;
        room.type = roomType.id;
        return Room.create(room);
      })
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
    .catch(done);
    });

    it('fail, room type null', (done) => {
      RoomType.create(v.getStandard())
      .then((roomType) => {
        const room = u.getStandard();
        room.type = null;
        return Room.create(room);
      })
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.message.toLowerCase()).to.contain('notnull violation');
        done();
      })
    .catch(done);
    });

  });
});

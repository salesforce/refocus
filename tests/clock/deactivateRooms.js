/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/deactivateRooms.js
 */
const expect = require('chai').expect;
const deactivateRooms = require('../../clock/scheduledJobs/deactivateRooms');
const tu = require('../testUtils');
const u = require('../db/model/room/utils');
const v = require('../db/model/roomType/utils');
const e = require('../db/model/event/utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Event = tu.db.Event;

const ZERO = 0;
const ONE = 1;
const MOON_LANDING = '1969-07-20T20:18:00+00:00';

describe('tests/clock/deactivateRooms.js >', () => {
  afterEach(u.forceDelete);
  afterEach(e.forceDelete);

  it('No rooms exist so none are deactivated', (done) => {
    deactivateRooms.execute()
    .then((deactivatedRooms) => {
      Room.findAll({ where: { active: true } })
      .then((r) => {
        expect(r.length).to.equal(ZERO);
        done();
      });
    })
    .catch(done);
  });

  it('Room that has no events at all should not be deactivated', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.createdAt = MOON_LANDING;
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      deactivateRooms.execute()
      .then((deactivatedRooms) => {
        Room.findOne({ where: { id: room.id } })
        .then((r) => {
          expect(r.active).to.equal(true);
          done();
        });
      });
    })
    .catch(done);
  });

  it('Room that has no recent events should be deactivated', (done) => {
    const testEvent = e.getStandard();
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.createdAt = MOON_LANDING;
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testEvent.roomId = room.id;
      testEvent.createdAt = MOON_LANDING;
      return (Event.create(testEvent));
    })
    .then((event) => {
      deactivateRooms.execute()
      .then((deactivatedRooms) => {
        Room.findOne({ where: { id: event.roomId } })
        .then((r) => {
          /*
           * Need to use event.destroy(); here because forceDelete relies
           * on the createdAt to be within timeframe of tests running.
           * I altered the createdAt of the event to test this properly.
           */
          event.destroy();
          expect(r.active).to.equal(false);
          done();
        });
      });
    })
    .catch(done);
  });

  it('Room that has recent events should not be deactivated', (done) => {
    const testEvent = e.getStandard();
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testEvent.roomId = room.id;
      return Event.create(testEvent);
    })
    .then((event) => {
      deactivateRooms.execute()
      .then((deactivatedRooms) => {
        Room.findOne({ where: { id: event.roomId } })
        .then((r) => {
          expect(r.active).to.equal(true);
          done();
        });
      });
    })
    .catch(done);
  });
});

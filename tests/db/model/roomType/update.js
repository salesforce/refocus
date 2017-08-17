/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/roomType/update.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const RoomType = tu.db.RoomType;
const invalidValue = '^thisValueisAlwaysInvalid#';

describe('tests/db/model/roomType/update.js >', () => {
  beforeEach((done) => {
    RoomType.create(u.getStandard())
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, room type isEnabled updated', (done) => {
    RoomType.findOne({ where: { name: u.name } })
    .then((o) => o.update({ isEnabled: false }))
    .then(() => RoomType.findOne({ where: { name: u.name } }))
    .then((o) => {
      expect(o).to.have.property('isEnabled').to.equal(false);
      done();
    })
    .catch(done);
  });

  it('ok, room type name updated', (done) => {
    RoomType.findOne({ where: { name: u.name } })
    .then((o) => o.update({ name: 'RoomTypeTest' }))
    .then(() => RoomType.findOne({ where: { name: 'RoomTypeTest' } }))
    .then((o) => {
      expect(o).to.have.property('name').to.equal('RoomTypeTest');
      done();
    })
    .catch(done);
  });

  it('fail, room type name bad', (done) => {
    RoomType.findOne({ where: { name: u.name } })
    .then((o) => o.update({ name: invalidValue }))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
    .catch(done);
  });
});

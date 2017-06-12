/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/roomType/find.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const RoomType = tu.db.RoomType;

describe('db: room type: find: ', () => {
  beforeEach((done) => {
    RoomType.create(u.getStandard())
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Find room type', () => {
    it('ok, room type active', (done) => {
      RoomType.findOne({ where: { active: true } })
      .then((o) => {
        expect(o).to.have.property('name').to.equal(u.name);
        done();
      })
      .catch(done);
    });
  });
});

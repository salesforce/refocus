/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/bot/create.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Room = tu.db.Room;

describe('db: room: create: ', () => {
  after(u.forceDelete);

  describe('Create a new room', () => {
    it('ok, room created', (done) => {
      Room.create(u.getStandard())
      .then((o) => {
        expect(o).to.have.property('name');
        expect(o).to.have.property('active').to.equal(false);
        done();
      })
    .catch(done);
    });
  });
});

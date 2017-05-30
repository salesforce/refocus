/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botData/delete.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const BotData = tu.db.BotData;
const constants = require('../../../../db/constants');

describe('db: bot data: delete: ', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Delete bot data', () => {
    it('ok, bot data deleted', (done) => {
      BotData.destroy({ where: { name: u.name } })
      .then(() => BotData.findAll())
      .then((o) => {
        expect(o.length).to.equal(0);
        done();
      })
      .catch(done);
    });
  });
});

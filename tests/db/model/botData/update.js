/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/update.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const BotData = tu.db.BotData;
const constants = require('../../../../db/constants');

describe('db: bot data: update: ', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Update bot data', () => {
    it('ok, bot data name', (done) => {
      BotData.findOne({ where: { name: u.name } })
      .then((o) => o.update({ name: 'name2' }))
      .then(() => BotData.findOne({ where: { name: 'name2' } }))
      .then((o) => {
        expect(o).to.have.property('name').to.equal('name2');
        done();
      })
      .catch(done);
    });

    it('fail, bot data bad name', (done) => {
      BotData.findOne({ where: { name: u.name } })
      .then((o) => o.update({ name: '@!#!#@' }))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
      .catch(done);
    });

    it('fail, bot data bad type', (done) => {
      BotData.findOne({ where: { name: u.name } })
      .then((o) => o.update({ type: '@!#!#@' }))
      .catch((err) => {
        expect(err.name).to.equal(tu.dbErrorName);
        expect(err.message.toLowerCase()).to.contain('invalid input value');
        done();
      })
      .catch(done);
    });
  });
});

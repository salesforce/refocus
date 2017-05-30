/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botData/create.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const BotData = tu.db.BotData;
const constants = require('../../../../db/constants');
const types = 'BOOLEAN,INTERGER,DECIMAL,ARRAY,STRING';

describe('db: bot data: create: ', () => {
  after(u.forceDelete);

  describe('Create a new bot data', () => {
    it('ok, bot data created', (done) => {
      BotData.create(u.getStandard())
      .then((o) => {
        expect(o).to.have.property('name').to.equal(u.name);
        expect(o).to.have.property('type');
        expect(types.indexOf(o.type)).to.not.equal(-1);
        done();
      })
    .catch(done);
    });

    it('fail, bot data wrong name', (done) => {
      let botData = u.getStandard();
      botData.name = '&!@*#!';
      BotData.create(botData)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        done();
      })
    .catch(done);
    });
  });
});

/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/create.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const BotAction = tu.db.BotAction;
const constants = require('../../../../db/constants');

describe('db: bot action: create: ', () => {
  after(u.forceDelete);

  describe('Create a new bot action', () => {
    it('ok, bot action created', (done) => {
      BotAction.create(u.getStandard())
      .then((o) => {
        expect(o).to.have.property('name').to.equal(u.name);
        expect(o).to.have.property('paramList');
        expect(o.paramList.length).to.equal(3);
        done();
      })
    .catch(done);
    });

    it('fail, bot action wrong name', (done) => {
      let botAction = u.getStandard();
      botAction.name = '&!@*#!';
      BotAction.create(botAction)
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

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
const Bot = tu.db.BotAction;

describe('db: bot: create: ', () => {
  after(u.forceDelete);

  describe('Create a new bot action', () => {
    it('ok, bot created', (done) => {
      Bot.create(u.getStandard())
      .then((o) => {
        expect(o).to.have.property('name');
        expect(o).to.have.property('url').to.equal('http://www.bar.com');
        expect(o).to.have.property('active').to.equal(true);
        expect(o).to.have.property('actions');
        expect(o.actions.length).to.equal(2);
        expect(o.actions[0].parameters.length).to.equal(4);
        expect(o).to.have.property('data');
        expect(o.data.length).to.equal(5);
        done();
      })
    .catch(done);
    });
  });
});

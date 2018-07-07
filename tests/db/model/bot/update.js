/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/bot/update.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Bot = tu.db.Bot;
const fs = require('fs');
const path = require('path');
const uiBlob = fs.readFileSync(path.join(__dirname, './uiBlob'));
const uiBlob2 = fs.readFileSync(path.join(__dirname, './uiBlob2'));
const constants = require('../../../../db/constants');

describe('tests/db/model/bot/update.js >', () => {
  beforeEach((done) => {
    u.createStandard()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, bot active updated', (done) => {
    Bot.findOne({ where: { name: u.name } })
    .then((o) => o.update({ active: false }))
    .then(() => Bot.findOne({ where: { name: u.name } }))
    .then((o) => {
      expect(o).to.have.property('active').to.equal(false);
      done();
    })
    .catch(done);
  });

  it('ok, bot url updated', (done) => {
    Bot.findOne({ where: { name: u.name } })
    .then((o) => o.update({ url: 'http://www.test.com' }))
    .then(() => Bot.findOne({ where: { name: u.name } }))
    .then((o) => {
      expect(o).to.have.property('url').to.equal('http://www.test.com');
      done();
    })
    .catch(done);
  });

  it('ok, bot ui updated', (done) => {
    Bot.scope('botUI').findOne({ where: { name: u.name } })
    .then((o) => {
      expect(o.ui.length).to.equal(uiBlob.length);
      return o.update({ ui: uiBlob2 });
    })
    .then(() => Bot.scope('botUI').findOne({ where: { name: u.name } }))
    .then((o) => {
      expect(o.ui.length).to.equal(uiBlob2.length);
      done();
    })
    .catch(done);
  });

  it('ok, bot version updated', (done) => {
    Bot.findOne({ where: { name: u.name } })
    .then((o) => o.update({ version: '2.0.0' }))
    .then(() => Bot.findOne({ where: { name: u.name } }))
    .then((o) => {
      expect(o).to.have.property('version').to.equal('2.0.0');
      done();
    })
    .catch(done);
  });

  it('ok, bot displayName updated', (done) => {
    Bot.findOne({ where: { name: u.name } })
      .then((o) => o.update({ displayName: 'Cool New Name' }))
      .then(() => Bot.findOne({ where: { name: u.name } }))
      .then((o) => {
        expect(o).to.have.property('displayName').to.equal('Cool New Name');
        done();
      })
      .catch(done);
  });

  it('fail, bot url bad', (done) => {
    Bot.findOne({ where: { name: u.name } })
    .then((o) => o.update({ url: 'noURL' }))
    .then(() => Bot.findOne({ where: { name: u.name } }))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
    .catch(done);
  });

  it('fail, bot displayName too long', (done) => {
    const newDisplayName = 'Name'.repeat(constants.fieldlen.normalName);
    Bot.findOne({ where: { name: u.name } })
    .then((o) => o.update({ displayName: newDisplayName }))
    .then(() => Bot.findOne({ where: { name: u.name } }))
    .catch((err) => {
      expect(err.name).to.equal(tu.dbErrorName);
      expect(err.message.toLowerCase()).to.contain('value too long');
      done();
    })
    .catch(done);
  });
});

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
const Bot = tu.db.Bot;
const constants = require('../../../../db/constants');
const invalidValue = '^thisValueisAlwaysInvalid#';

describe('tests/db/model/bot/create.js >', () => {
  after(u.forceDelete);

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
      expect(o).to.have.property('settings');
      expect(o.settings.length).to.equal(1);
      expect(o).to.have.property('version').to.equal('1.0.0');
      expect(o).to.have.property('displayName').to.equal(u.displayName);
      done();
    })
  .catch(done);
  });

  it('fail, bot empty name', (done) => {
    Bot.create({
      name: '',
      url: 'http://www.bar.com',
      active: true,
      version: '1.0.0',
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      expect(err.message.toLowerCase()).to.contain(
        'validation is on name failed'
      );
      expect(err.errors[0].path).to.equal('name');
      done();
    })
  .catch(done);
  });

  it('fail, duplicate bot name', (done) => {
    Promise.all([Bot.create(u.getStandard()), Bot.create(u.getStandard())])
    .then(() => done(tu.uniError))
    .catch((err) => {
      expect(err.name).to.equal(tu.uniErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      expect(err.errors[0].message).to.contain('name must be unique');
      expect(err.errors[0].type).to.equal('unique violation');
      done();
    })
  .catch(done);
  });

  it('fail, bot wrong url', (done) => {
    Bot.create({
      name: u.name,
      url: 'notURL',
      active: true,
      version: '1.0.0',
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      expect(err.message.toLowerCase()).to.contain(
        'validation isurl on url failed'
      );
      done();
    })
  .catch(done);
  });

  it('fail, bot wrong name', (done) => {
    Bot.create({
      name: invalidValue,
      url: 'http://www.test.com',
      active: true,
      version: '1.0.0',
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot wrong action parameter name', (done) => {
    let bot = u.getStandard();
    bot.actions[0].parameters[0].name = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot wrong action parameter type', (done) => {
    let bot = u.getStandard();
    bot.actions[0].parameters[0].type = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot wrong data parameter name', (done) => {
    let bot = u.getStandard();
    bot.data[0].name = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot wrong data parameter type', (done) => {
    let bot = u.getStandard();
    bot.data[0].type = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot data is not an array', (done) => {
    let bot = u.getStandard();
    bot.data = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot data missing name', (done) => {
    let bot = u.getStandard();
    bot.data[0] = { type: 'INTEGER' };
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot data missing type', (done) => {
    let bot = u.getStandard();
    bot.data[0] = { name: 'testName' };
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot action is not an array', (done) => {
    let bot = u.getStandard();
    bot.actions = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot action missing name', (done) => {
    let bot = u.getStandard();
    bot.actions[0] = { parameters: [] };
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot actions bad name', (done) => {
    let bot = u.getStandard();
    bot.actions[0].name = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot action parameters not array', (done) => {
    let bot = u.getStandard();
    bot.actions[0].parameters = invalidValue;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, bot action parameters not array of object', (done) => {
    let bot = u.getStandard();
    bot.actions[0].parameters[0] = [invalidValue];
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
  .catch(done);
  });

  it('fail, no version specified', (done) => {
    let bot = u.getStandard();
    delete bot.version;
    Bot.create(bot)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('version cannot be null');
      done();
    })
  .catch(done);
  });

  it('fail, bot displayName too long', (done) => {
    let bot = u.getStandard();
    bot.displayName = 'Name'.repeat(constants.fieldlen.normalName);
    Bot.create(bot)
    .then((res) => done(tu.valError))
    .catch((err) => {
      expect(err.message).to.contain('value too long');
      done();
    })
  .catch(done);
  });
});

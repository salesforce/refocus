/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/token/unusedSince.js
 */
'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Token = tu.db.Token;

describe('tests/db/model/token/unusedSince.js >', () => {
  const sixtyFiveSecondsAgo = new Date(new Date() - 1000 * 65);
  const twentyFiveHoursAgo = new Date(new Date() - 1000 * 60 * 60 * 25);
  const fortyDaysAgo = new Date(new Date() - 1000 * 60 * 60 * 24 * 40);
  const tokens = [
    { name: tu.namePrefix + 't1', lastUsed: sixtyFiveSecondsAgo },
    { name: tu.namePrefix + 't2', lastUsed: twentyFiveHoursAgo },
    { name: tu.namePrefix + 't3', lastUsed: fortyDaysAgo },
  ];
  before(() => u.createMultipleTokens(tokens));
  after(u.forceDelete);

  it('since 1m ago', (done) => {
    Token.scope({ method: ['unusedSince', '-1m'] }).findAll()
    .then((tokens) => expect(tokens).to.have.property('length', 3))
    .then(() => done())
    .catch(done);
  });

  it('since -1d', (done) => {
    Token.scope({ method: ['unusedSince', '-1d'] }).findAll()
    .then((tokens) => expect(tokens).to.have.property('length', 2))
    .then(() => done())
    .catch(done);
  });

  it('since -30d', (done) => {
    Token.scope({ method: ['unusedSince', '-30d'] }).findAll()
    .then((tokens) => expect(tokens).to.have.property('length', 1))
    .then(() => done())
    .catch(done);
  });

  it('since -60d', (done) => {
    Token.scope({ method: ['unusedSince', '-60d'] }).findAll()
    .then((tokens) => expect(tokens).to.have.property('length', 0))
    .then(() => done())
    .catch(done);
  });

  it('since future time e.g. 1h', (done) => {
    Token.scope({ method: ['unusedSince', '1h'] }).findAll()
    .then((tokens) => expect(tokens).to.have.property('length', 3))
    .then(() => done())
    .catch(done);
  });

  it('invalid time', (done) => {
    const msg = 
      'invalid input syntax for type timestamp with time zone: "Invalid date"';
    Token.scope({ method: ['unusedSince', 'Hello, World'] }).findAll()
    .then((tokens) => done(new Error('Expecting error')))
    .catch((err) => {
      expect(err).to.have.property('message', msg);
      done();
    });
  });
});

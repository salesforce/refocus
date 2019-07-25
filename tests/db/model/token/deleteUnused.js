/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/token/deleteUnused.js
 */
'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Token = tu.db.Token;
const SIXTY_FIVE_SECONDS = 65000;
const TWENTY_FIVE_HOURS = 90000000;
const FORTY_DAYS = 3456000000;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;

describe('tests/db/model/token/deleteUnused.js >', () => {
  const sixtyFiveSecondsAgo = new Date(new Date() - SIXTY_FIVE_SECONDS);
  const twentyFiveHoursAgo = new Date(new Date() - TWENTY_FIVE_HOURS);
  const fortyDaysAgo = new Date(new Date() - FORTY_DAYS);
  const tokensToCreate = [
    { name: tu.namePrefix + 't1', lastUsed: sixtyFiveSecondsAgo },
    { name: tu.namePrefix + 't2', lastUsed: twentyFiveHoursAgo },
    { name: tu.namePrefix + 't3', lastUsed: fortyDaysAgo },
  ];
  beforeEach(() => u.createMultipleTokens(tokensToCreate));
  afterEach(u.forceDelete);

  it('since 1m ago', (done) => {
    Token.deleteUnused('-1m')
      .then((n) => expect(n).to.equal(THREE))
      .then(() => done())
      .catch(done);
  });

  it('since -1d', (done) => {
    Token.deleteUnused('-1d')
      .then((n) => expect(n).to.equal(TWO))
      .then(() => done())
      .catch(done);
  });

  it('since -30d', (done) => {
    Token.deleteUnused('-30d')
      .then((n) => expect(n).to.equal(ONE))
      .then(() => done())
      .catch(done);
  });

  it('since -60d', (done) => {
    Token.deleteUnused('-60d')
      .then((n) => expect(n).to.equal(ZERO))
      .then(() => done())
      .catch(done);
  });

  it('since future time e.g. 1h', (done) => {
    Token.deleteUnused('1h')
      .then((n) => expect(n).to.equal(ZERO))
      .then(() => done())
      .catch(done);
  });

  it('invalid time', (done) => {
    Token.deleteUnused('Hello, World')
      .then((n) => expect(n).to.equal(ZERO))
      .then(() => done())
      .catch(done);
  });
});

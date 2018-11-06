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
const sinon = require('sinon');
const tu = require('../../../testUtils');
const u = require('./utils');
const Token = tu.db.Token;

describe('tests/db/model/token/unusedSince.js >', () => {
  const tokens = [
    { name: 't1', lastUsed: '2018-10-05 22:10:33.724+00' },
    { name: 't2', lastUsed: '2018-10-04 22:10:33.724+00' },
    { name: 't3', lastUsed: '2018-09-04 22:10:33.724+00' },
  ];

  const now = new Date('2018-10-06 00:00:00.000+00');
  let clock;

  before(() => {
    clock = sinon.useFakeTimers(now);
    u.createMultipleTokens(tokens);
  });

  after(() => {
    u.forceDelete();
    clock.restore();
  });
  
  it('since 1m ago', (done) => {
    Token.scope({ method: ['unusedSince', '-1m'] }).findAll()
    .then((tokens) => {
      expect(tokens).to.have.property('length', 3);
      done();
    })
    .catch(done);
  });

  it('since -1d', (done) => {
    Token.scope({ method: ['unusedSince', '-1d'] }).findAll()
    .then((tokens) => {
      expect(tokens).to.have.property('length', 2);
      done();
    })
    .catch(done);
  });

  it('since -30d', (done) => {
    Token.scope({ method: ['unusedSince', '-30d'] }).findAll()
    .then((tokens) => {
      expect(tokens).to.have.property('length', 1);
      done();
    })
    .catch(done);
  });

  it('since -60d', (done) => {
    Token.scope({ method: ['unusedSince', '-60d'] }).findAll()
    .then((tokens) => {
      expect(tokens).to.have.property('length', 0);
      done();
    })
    .catch(done);
  });

  it('since future time e.g. 1h', (done) => {
    Token.scope({ method: ['unusedSince', '1h'] }).findAll()
    .then((tokens) => {
      expect(tokens).to.have.property('length', 3);
      done();
    })
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

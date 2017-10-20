/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/utils/jwtUtil.js
 */
'use strict';// eslint-disable-line strict

const expect = require('chai').expect;
const jwtUtils = require('../../utils/jwtUtil');
const tu = require('../testUtils');
const Bot = tu.db.Bot;
const n = `${tu.namePrefix}Testing`;
const testStartTime = new Date();

describe('tests/utils/jwtUtil.js >', () => {
  const newBot ={
    name: n,
    url: 'http://www.bar.com',
    active: true,
  };

  it('ok, bot verified', (done) => {
    Bot.create(newBot)
    .then((o) => {
      const token = jwtUtils
        .createToken(o.name, o.name);
      jwtUtils.verifyBotToken(token).then((check) => {
        expect(check).to.not.equal(undefined);
      });
    }).then(() => tu.forceDelete(tu.db.Bot, testStartTime))
    .then(() => done())
  .catch(done);
  });

  it('ok, bot failed', (done) => {
    const randomToken = jwtUtils
        .createToken('failure', 'failure');
    jwtUtils.verifyBotToken(randomToken).then((check) => {
      expect(check).to.equal(null);
    }).then(() => done());
  });
});

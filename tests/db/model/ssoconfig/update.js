/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/ssoconfig/update.js
 */

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const SSOConfig = tu.db.SSOConfig;

describe('tests/db/model/ssoconfig/update.js >', () => {
  beforeEach((done) => {
    u.creatSSOConfig()
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('simple', (done) => {
    SSOConfig.findOne()
    .then((o) => o.update({ samlIssuer: 'passport-saml123' }))
    .then(() => SSOConfig.findOne())
    .then((o) => {
      expect(o.samlIssuer).to.equal('passport-saml123');
      done();
    })
    .catch(done);
  });
});

/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/ssoconfig/create.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const SSOConfig = tu.db.SSOConfig;

describe('tests/db/model/ssoconfig/create.js >', () => {
  let ssoconfig = {};

  beforeEach((done) => {
    u.creatSSOConfig()
    .then((createdSSOConfig) => {
      ssoconfig = createdSSOConfig;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('expects correct ssoconfig parameters', (done) => {
    expect(ssoconfig).to.have.property('samlEntryPoint').to.equal(
      u.samlParams.samlEntryPoint
    );
    expect(ssoconfig).to.have.property('samlIssuer').to.equal(
      u.samlParams.samlIssuer
    );
    done();
  });

  it('Get deleted ssoconfig by id, should return null', (done) => {
    ssoconfig.destroy()
    .then(() => SSOConfig.findByPk(ssoconfig.id))
    .then((foundSSOConfig) => {
      expect(foundSSOConfig).to.equal(null);
      done();
    })
    .catch(done);
  });

  it('Adding new row should fail', (done) => {
    SSOConfig.create({
      samlEntryPoint: u.samlParams.samlEntryPoint,
      samlIssuer: u.samlParams.samlIssuer,
    })
    .then(() => done('This should have thrown an error!'))
    .catch((err) => {
      expect(err).to.have.property('name')
      .to.equal('SSOConfigCreateConstraintError');
      expect(err).to.have.property('subject');
      done();
    });
  });
});

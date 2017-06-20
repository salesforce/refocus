/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collector/create.js
 */

'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;

describe('tests/db/model/collector/create.js >', () => {
  let userId;
  let collectorObj;
  beforeEach((done) => {
    tu.createUser('testUser')
    .then((user) => {
      userId = user.id;
      u.collectorObj.createdBy = user.id;
      collectorObj = JSON.parse(JSON.stringify(u.collectorObj));
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Create collector, OK', (done) => {
    Collector.create(collectorObj)
    .then((obj) => {
      expect(obj.name).to.be.equal('___Collector');
      expect(obj.registered).to.be.equal(true);
      expect(obj.status).to.be.equal('Stopped');
      expect(obj.description).to.be.equal(
        'This is a mock collector object for testing.'
      );
      expect(obj.helpEmail).to.be.equal('test@test.com');
      expect(obj.helpUrl).to.be.equal('http://test.com');
      expect(obj.createdBy).to.be.equal(userId);
      expect(obj.updatedAt).to.not.be.null;
      expect(obj.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('Create collector, error if invalid status', (done) => {
    collectorObj.status = 'NotAStatus';
    Collector.create(collectorObj)
    .then(() => done(tu.dbError))
    .catch((err) => {
      expect(err.name).to.equal(tu.dbErrorName);
      expect(err.message).to.contain(
        'invalid input value for enum "enum_Collectors_status": "NotAStatus"'
      );
      done();
    });
  });

  it('Create collector, error if invalid url', (done) => {
    collectorObj.helpUrl = 'NotAurl';
    Collector.create(collectorObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message).to.contain(
        'Validation isUrl failed'
      );
      done();
    });
  });

  it('Create collector, error if invalid email', (done) => {
    collectorObj.helpEmail = 'NotAnEmail';

    Collector.create(collectorObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message).to.contain(
        'Validation isEmail failed'
      );
      done();
    });
  });

  it('Create collector, error if invalid name', (done) => {
    collectorObj.name = 'Invalid@name';
    Collector.create(collectorObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message).to.contain(
        'Validation is failed'
      );
      done();
    });
  });
});

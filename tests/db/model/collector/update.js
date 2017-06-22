/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collector/update.js
 */

'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;

describe('tests/db/model/collector/update.js >', () => {
  let userId;
  let anotherUserId;
  let collectorDb;
  beforeEach((done) => {
    tu.createUser('testUser')
    .then((user) => {
      userId = user.id;
      u.collectorObj.createdBy = user.id;
      return Collector.create(u.collectorObj);
    })
    .then((c) => {
      collectorDb = c;
      return tu.createUser('anotherUser');
    })
    .then((anotherUser) => {
      anotherUserId = anotherUser.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Update status', (done) => {
    expect(collectorDb.status).to.be.equal('Stopped'); // before
    collectorDb.update({ status: 'Running' })
    .then((obj) => {
      expect(obj.status).to.be.equal('Running'); // after
      done();
    })
    .catch(done);
  });

  it('Update registered', (done) => {
    expect(collectorDb.registered).to.be.equal(true); // before
    collectorDb.update({ registered: false })
    .then((obj) => {
      expect(obj.registered).to.be.equal(false); // after
      done();
    })
    .catch(done);
  });

  it('Update name', (done) => {
    expect(collectorDb.name).to.be.equal('___Collector'); // before
    collectorDb.update({ name: '___NameChanged' })
    .then((obj) => {
      expect(obj.name).to.be.equal('___NameChanged'); // after
      done();
    })
    .catch(done);
  });

  it('Update helpUrl', (done) => {
    expect(collectorDb.helpUrl).to.be.equal('http://test.com'); // before
    collectorDb.update({ helpUrl: 'http://testChanged.com' })
    .then((obj) => {
      expect(obj.helpUrl).to.be.equal('http://testChanged.com'); // after
      done();
    })
    .catch(done);
  });

  it('Update helpEmail', (done) => {
    expect(collectorDb.helpEmail).to.be.equal('test@test.com'); // before
    collectorDb.update({ helpEmail: 'test@testChanged.com' })
    .then((obj) => {
      expect(obj.helpEmail).to.be.equal('test@testChanged.com'); // after
      done();
    })
    .catch(done);
  });

  it('Update description', (done) => {
    expect(collectorDb.description).to.be.equal(
      'This is a mock collector object for testing.'
    ); // before
    collectorDb.update({ description: 'Changed description' })
    .then((obj) => {
      expect(obj.description).to.be.equal('Changed description'); // after
      done();
    })
    .catch(done);
  });

  it('Update createdBy', (done) => {
    expect(collectorDb.createdBy).to.be.equal(userId); // before
    collectorDb.update({ createdBy: anotherUserId })
    .then((obj) => {
      expect(obj.createdBy).to.be.equal(anotherUserId); // after
      done();
    })
    .catch(done);
  });
});

/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collector/find.js
 */
'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;

describe('tests/db/model/collector/find.js >', () => {
  let userId;
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
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Find by Id', (done) => {
    Collector.findById(collectorDb.id)
    .then((obj) => {
      expect(obj.name).to.be.equal('___Collector');
      expect(obj.registered).to.be.equal(true);
      expect(obj.status).to.be.equal('Stopped');
      expect(obj.description).to.be.equal(
        'This is a mock collector object for testing.'
      );
      expect(obj.helpEmail).to.be.equal('test@test.com');
      expect(obj.helpUrl).to.be.equal('http://test.com');
      expect(obj.host).to.be.equal('xxx-yyy-zzz.aaa.bbb.ccc.com');
      expect(obj.ipAddress).to.be.equal('123.456.789.012');
      expect(obj.createdBy).to.be.equal(userId);
      expect(obj.updatedAt).to.not.be.null;
      expect(obj.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('Find, using where', (done) => {
    Collector.findOne({ where: { id: collectorDb.id } })
    .then((obj) => {
      expect(obj.name).to.be.equal('___Collector');
      expect(obj.registered).to.be.equal(true);
      expect(obj.status).to.be.equal('Stopped');
      expect(obj.description).to.be.equal(
        'This is a mock collector object for testing.'
      );
      expect(obj.helpEmail).to.be.equal('test@test.com');
      expect(obj.helpUrl).to.be.equal('http://test.com');
      expect(obj.host).to.be.equal('xxx-yyy-zzz.aaa.bbb.ccc.com');
      expect(obj.ipAddress).to.be.equal('123.456.789.012');
      expect(obj.createdBy).to.be.equal(userId);
      expect(obj.updatedAt).to.not.be.null;
      expect(obj.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('Find all', (done) => {
    Collector.findAll()
    .then((objs) => {
      expect(objs.length).to.be.equal(1);
      const obj = objs[0];
      expect(obj.name).to.be.equal('___Collector');
      expect(obj.registered).to.be.equal(true);
      expect(obj.status).to.be.equal('Stopped');
      expect(obj.description).to.be.equal(
        'This is a mock collector object for testing.'
      );
      expect(obj.helpEmail).to.be.equal('test@test.com');
      expect(obj.helpUrl).to.be.equal('http://test.com');
      expect(obj.host).to.be.equal('xxx-yyy-zzz.aaa.bbb.ccc.com');
      expect(obj.ipAddress).to.be.equal('123.456.789.012');
      expect(obj.osInfo).to.deep.equal({
        hostname: 'testHostname',
        username: 'testUsername',
      });
      expect(obj.processInfo).to.deep.equal({
        execPath: 'testExecPath',
        memoryUsage: {
          heapTotal: 1234,
          external: 5678,
        },
        version: 'v1',
        versions: { a: 'a', b: 'b' },
      });
      expect(obj.version).to.be.equal('1.0.0');
      expect(obj.createdBy).to.be.equal(userId);
      expect(obj.updatedAt).to.not.be.null;
      expect(obj.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });
});

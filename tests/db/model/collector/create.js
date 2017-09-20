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

  it('correct profile access field name', () => {
    expect(Collector.getProfileAccessField()).to.equal('collectorAccess');
  });

  it('Create collector, OK, check collector writer', (done) => {
    let cObj;
    Collector.create(collectorObj)
    .then((obj) => {
      cObj = obj;
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
      return obj.getWriters();
    })
    .then((w) => {
      expect(w.length).to.be.equal(1);
      expect(w[0].email).to.be.equal('testUser@testUser.com');
      expect(w[0].CollectorWriters.userId).to.be.equal(userId);
      expect(w[0].CollectorWriters.collectorId).to.be.equal(cObj.id);
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

  it('Create collector, error if invalid processInfo', (done) => {
    collectorObj.processInfo = {
      execPath: 'testExecPath',
      memoryUsage: {
        heapTotal: 'should be a number',
        external: 5678,
      },
      version: 'v1',
      versions: { a: 'a', b: 'b' },
    };
    Collector.create(collectorObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('\\"heapTotal\\" must be a number');
      done();
    });
  });

  it('Create collector, error if invalid osInfo', (done) => {
    collectorObj.osInfo = {
      arch: 123,
      hostname: 'testHostname',
      username: 'testUsername',
    };
    Collector.create(collectorObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('\\"arch\\" must be a string');
      done();
    });
  });

  it('Create collector, error if invalid version', (done) => {
    collectorObj.version = '1';
    Collector.create(collectorObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('Validation error: Not a valid version.');
      done();
    });
  });

  it('Create collector, OK if missing host or ipAddress or osInfo or ' +
    'processInfo', (done) => {
    delete collectorObj.host;
    delete collectorObj.ipAddress;
    delete collectorObj.osInfo;
    delete collectorObj.processInfo;
    Collector.create(collectorObj)
    .then((obj) => {
      expect(obj.name).to.be.equal('___Collector');
      done();
    })
    .catch(done);
  });

  it('isWritableBy, OK', (done) => {
    let cObj;
    Collector.create(collectorObj)
    .then((obj) => {
      cObj = obj;
      return obj.getWriters();
    })
    .then((w) => {
      expect(w.length).to.be.equal(1);
      expect(w[0].id).to.be.equal(userId);
      return cObj.isWritableBy(userId);
    })
    .then((res) => {
      expect(res).to.be.true;
      done();
    })
    .catch(done);
  });
});

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

  it('Update status [Stopped --> Running] OK', (done) => {
    expect(collectorDb.status).to.be.equal('Stopped');
    collectorDb.update({ status: 'Running' })
    .then((obj) => {
      expect(obj.status).to.be.equal('Running');
      done();
    })
    .catch(done);
  });

  it('Update status [Stopped --> Paused] invalid', (done) => {
    expect(collectorDb.status).to.be.equal('Stopped');
    collectorDb.update({ status: 'Paused' })
    .then((obj) => {
      done('Expecting error');
    })
    .catch((err) => {
      expect(err.name).to.be.equal('ValidationError');
      done();
    });
  });

  it('Update status [Running --> Stopped] OK', (done) => {
    expect(collectorDb.status).to.be.equal('Stopped');
    collectorDb.update({ status: 'Running' })
    .then((obj) => {
      expect(obj.status).to.be.equal('Running');
      return collectorDb.update({ status: 'Stopped' });
    })
    .then((obj) => {
      expect(obj.status).to.be.equal('Stopped');
      done();
    })
    .catch(done);
  });

  it('Update status [Running --> Paused] OK', (done) => {
    expect(collectorDb.status).to.be.equal('Stopped');
    collectorDb.update({ status: 'Running' })
    .then((obj) => {
      expect(obj.status).to.be.equal('Running');
      return collectorDb.update({ status: 'Paused' });
    })
    .then((obj) => {
      expect(obj.status).to.be.equal('Paused');
      done();
    })
    .catch(done);
  });

  it('Update status [Paused --> Running] OK', (done) => {
    expect(collectorDb.status).to.be.equal('Stopped');
    collectorDb.update({ status: 'Running' })
    .then((obj) => {
      expect(obj.status).to.be.equal('Running');
      return collectorDb.update({ status: 'Paused' });
    })
    .then((obj) => {
      expect(obj.status).to.be.equal('Paused');
      return collectorDb.update({ status: 'Running' });
    })
    .then((obj) => {
      expect(obj.status).to.be.equal('Running');
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

  it('Update host', (done) => {
    expect(collectorDb.host).to.be.equal('xxx-yyy-zzz.aaa.bbb.ccc.com');
    collectorDb.update({ host: 'changed' })
    .then((obj) => {
      expect(obj.host).to.be.equal('changed'); // after
      done();
    })
    .catch(done);
  });

  it('Update ipAddress', (done) => {
    expect(collectorDb.ipAddress).to.be.equal('123.456.789.012');
    collectorDb.update({ ipAddress: '127.0.0.1' })
    .then((obj) => {
      expect(obj.ipAddress).to.be.equal('127.0.0.1'); // after
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

  it('Update lastHeartbeat', (done) => {
    const d = new Date(Date.UTC(2017, 5, 21, 13, 55, 10));
    collectorDb.update({ lastHeartbeat: d })
    .then((obj) => {
      expect(obj.lastHeartbeat.valueOf()).to.be.equal(1498053310000);
      expect(obj.lastHeartbeat.getMinutes()).to.be.equal(55);
      done();
    })
    .catch(done);
  });

  it('Update osInfo', (done) => {
    expect(collectorDb.osInfo).to.deep.equal(
      { hostname: 'testHostname', username: 'testUsername' }
    ); // before
    const newOsInfo = {
      platform: 'centos',
      hostname: 'newHostname',
      username: 'newUsername',
    };
    collectorDb.update({ osInfo: newOsInfo })
    .then((obj) => {
      expect(obj.osInfo).to.deep.equal(newOsInfo); // after
      done();
    })
    .catch(done);
  });

  it('Update processInfo', (done) => {
    expect(collectorDb.processInfo).to.deep.equal({
      execPath: 'testExecPath',
      memoryUsage: {
        heapTotal: 1234,
        external: 5678,
      },
      version: 'v1',
      versions: { a: 'a', b: 'b' },
    }); // before
    const newProcessInfo = {
      execPath: 'newExecPath',
      version: 'v2',
    };
    collectorDb.update({ processInfo: newProcessInfo })
    .then((obj) => {
      expect(obj.processInfo).to.deep.equal(newProcessInfo); // after
      done();
    })
    .catch(done);
  });

  it('Update version', (done) => {
    expect(collectorDb.version).to.be.equal('1.0.0'); // before
    const newVersion = '1.1.1';
    collectorDb.update({ version: newVersion })
    .then((obj) => {
      expect(obj.version).to.be.equal(newVersion); // after
      done();
    })
    .catch(done);
  });
});

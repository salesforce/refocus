/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/utils.js
 */
const expect = require('chai').expect;
const u = require('../../db/utils');

describe('db utils', () => {

  it('dbConfigObjectFromDbURL localhost', (done) => {
    const dbconfig = u.dbConfigObjectFromDbURL(
      'postgres://postgres:postgres@localhost:5432/focusdb');
    expect(dbconfig).to.have.property('name', 'focusdb');
    expect(dbconfig).to.have.property('user', 'postgres');
    expect(dbconfig).to.have.property('password', 'postgres');
    expect(dbconfig).to.have.property('host', 'localhost');
    expect(dbconfig).to.have.property('port', '5432');
    done();
  }); // dbConfigObjectFromDbURL localhost

  it('dbConfigObjectFromDbURL heroku-ish', (done) => {
    const dbconfig = u.dbConfigObjectFromDbURL(
      'postgres://abc:def@ec2-00-00-000-000.compute-0.amazonaws.com:5432/ghi');
    expect(dbconfig).to.have.property('name', 'ghi');
    expect(dbconfig).to.have.property('user', 'abc');
    expect(dbconfig).to.have.property('password', 'def');
    expect(dbconfig).to.have.property('host',
      'ec2-00-00-000-000.compute-0.amazonaws.com');
    expect(dbconfig).to.have.property('port', '5432');
    done();
  }); // dbConfigObjectFromDbURL heroku-ish

  it('getReadOnlyDBConfig from localurl', (done) => {
    const replicas = ['postgres://postgres:postgres@localhost:5432/focusdb',
    'postgres://postgres:postgres@localhost:9432/focusdb'
    ];
    const replicaConfig = u.getReadOnlyDBConfig(replicas);
    expect(replicaConfig).to.have.lengthOf(2);
    expect(replicaConfig[0]).to.have.property('username', 'postgres');
    expect(replicaConfig[0]).to.have.property('password', 'postgres');
    expect(replicaConfig[0]).to.have.property('host', 'localhost');
    expect(replicaConfig[0]).to.have.property('port', '5432');

    expect(replicaConfig[1]).to.have.property('username', 'postgres');
    expect(replicaConfig[1]).to.have.property('password', 'postgres');
    expect(replicaConfig[1]).to.have.property('host', 'localhost');
    expect(replicaConfig[1]).to.have.property('port', '9432');


    done();
  }); // getReadOnlyDBConfig local

  it('getReadOnlyDBConfig from heroku-ish url', (done) => {
    const replicas =
    ['postgres://user1:pwd1@ec2-00-00-000-000.compute-0.amazonaws.com:5432/db',
    'postgres://user1:pwd1@ec2-00-00-000-111.compute-0.amazonaws.com:5432/db'
    ];
    const replicaConfig = u.getReadOnlyDBConfig(replicas);
    expect(replicaConfig).to.have.lengthOf(2);
    expect(replicaConfig[0]).to.have.property('username', 'user1');
    expect(replicaConfig[0]).to.have.property('password', 'pwd1');
    expect(replicaConfig[0]).to.have.property('host',
      'ec2-00-00-000-000.compute-0.amazonaws.com');
    expect(replicaConfig[0]).to.have.property('port', '5432');

    expect(replicaConfig[1]).to.have.property('username', 'user1');
    expect(replicaConfig[1]).to.have.property('password', 'pwd1');
    expect(replicaConfig[1]).to.have.property('host',
      'ec2-00-00-000-111.compute-0.amazonaws.com');
    expect(replicaConfig[1]).to.have.property('port', '5432');


    done();
  }); // getReadOnlyDBConfig heroku-ish

  it('getDBReplicationObject from local', (done) => {
    const dbconfig = u.dbConfigObjectFromDbURL(
    'postgres://postgres:postgres@localhost:5432/focusdb');
    const seqRepConf = u.getDBReplicationObject(dbconfig);
    expect(seqRepConf).to.have.property('write');
    expect(seqRepConf.read).to.equal(undefined);
    expect(seqRepConf.write).to.have.property('username', 'postgres');
    expect(seqRepConf.write).to.have.property('password', 'postgres');
    expect(seqRepConf.write).to.have.property('host', 'localhost');
    expect(seqRepConf.write).to.have.property('port', '5432');
    done();
  }); // getDBReplicationObject local

  it('getDBReplicationObject from heroku-ish url', (done) => {
    const dbconfig = u.dbConfigObjectFromDbURL(
    'postgres://user1:pwd1@ec2-00-00-000-000.compute-0.amazonaws.com:5432/db');
    const seqRepConf = u.getDBReplicationObject(dbconfig);
    expect(seqRepConf).to.have.property('write');
    expect(seqRepConf.read).to.equal(undefined);
    expect(seqRepConf.write).to.have.property('username', 'user1');
    expect(seqRepConf.write).to.have.property('password', 'pwd1');
    expect(seqRepConf.write).to.have.property('host',
      'ec2-00-00-000-000.compute-0.amazonaws.com');
    expect(seqRepConf.write).to.have.property('port', '5432');
    done();
  }); // getDBReplicationObject heroku-ish

}); // db utils

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
}); // db utils

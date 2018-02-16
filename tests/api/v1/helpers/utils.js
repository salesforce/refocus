/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/helpers/utils.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const Subject = tu.db.Subject;
const expect = require('chai').expect;
const apiUtils = require('../../../../api/v1/helpers/verbs/utils.js');

describe('tests/api/v1/helpers/utils.js >', () => {
  let subject;
  const na = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
  };
  before((done) => {
    Subject.create(na)
    .then((sub) => {
      subject = sub;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteSubject);
  after(tu.forceDeleteUser);
  describe('isWritable >', () => {
    it('with req object containing username', (done) => {
      const fakeReq = { user: { name: 'myUserName' } };
      apiUtils.isWritable(fakeReq, subject)
      .then((ok) => {
        expect(ok).to.equal(subject);
        done();
      })
      .catch(done);
    });

    it('request object does not contain the user', (done) => {
      const fakeReq = { };
      apiUtils.isWritable(fakeReq, subject)
      .then((ok) => {
        expect(ok).to.equal(subject);
        done();
      })
      .catch(done);
    });
  });
});

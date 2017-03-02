/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/get.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const path = '/v1/samples';
const expect = require('chai').expect;

describe(`api::redisEnabled::GET ${path}`, () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before(rtu.populateRedis);
  after(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('basic get, sorted lexicographically by default', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].name).to.be
      .equal('___Subject1.___Subject2|___Aspect1');
      expect(res.body[1].name).to.be
      .equal('___Subject1.___Subject2|___Aspect2');
      expect(res.body[2].name).to.be
      .equal('___Subject1.___Subject3|___Aspect1');
      expect(res.body[0].status).to.be.equal('Critical');
      expect(res.body[0].value).to.be.equal('0');
      expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
      expect(res.body[0].relatedLinks).to.be.eql([
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ]);
      done();
    });
  });

  it('basic get by name', (done) => {
    const sampleName = '___Subject1.___Subject3|___Aspect1';
    api.get(`${path}/${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.be.equal('___Subject1.___Subject3|___Aspect1');
      expect(res.body.status).to.be.equal('Invalid');
      expect(res.body.value).to.be.equal('5');
      expect(res.body.relatedLinks).to.be.eql([
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ]);
      expect(res.body.apiLinks).to.be.eql([
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'DELETE',
          rel: 'Delete this sample',
        },
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'GET',
          rel: 'Retrieve this sample',
        },
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'PATCH',
          rel: 'Update selected attributes of this sample',
        },
        { href: '/v1/samples',
          method: 'POST',
          rel: 'Create a new sample',
        },
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'PUT',
          rel: 'Overwrite all attributes of this sample',
        },
      ]);
      expect(res.body.aspect.name).to.be.equal('___Aspect1');
      expect(res.body.aspect.relatedLinks).to.be.eql([
        { name: 'Google', value: 'http://www.google.com' },
        { name: 'Yahoo', value: 'http://www.yahoo.com' },
      ]);
      expect(res.body.aspect.criticalRange).to.be.eql([0, 1]);
      done();
    });
  });
});

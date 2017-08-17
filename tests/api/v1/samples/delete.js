/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/delete.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const path = '/v1/samples';
const allDeletePath = '/v1/samples/{key}/relatedLinks';
const oneDeletePath = '/v1/samples/{key}/relatedLinks/{akey}';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe('tests/api/v1/samples/delete.js >', () => {
  describe(`DELETE ${path} >`, () => {
    let sampleName;
    let token;

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      u.doSetup()
      .then((samp) => Sample.create(samp))
      .then((samp) => {
        sampleName = samp.name;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('in basic delete, apiLinks only contains the POST endpoint', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        const { apiLinks } = res.body;
        expect(apiLinks.length).to.equal(ONE);
        expect(apiLinks[0].method).to.equal('POST');
        expect(apiLinks[0].href).to.equal(path);
      })
      .end(done);
    });

    it('basic delete', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (tu.gotExpectedLength(res.body, ZERO)) {
          throw new Error('expecting sample');
        }
      })
      .end(done);
    });

    it('does not return id', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(sampleName);
        done();
      });
    });

    it('is case in-sensitive', (done) => {
      api.delete(`${path}/${sampleName.toLowerCase()}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(sampleName);
        done();
      });
    });
  });

  describe('DELETE RelatedLinks >', () => {
    let token;
    let sampleName;

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      u.doSetup()
      .then((samp) => {
        samp.relatedLinks = [
          {
            name: 'rlink0',
            url: 'https://samples.com',
          },
          {
            name: 'rlink1',
            url: 'https://samples.com',
          },
        ];
        return Sample.create(
          samp
        );
      })
      .then((samp) => {
        sampleName = samp.name;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('delete all related links', (done) => {
      api.delete(allDeletePath.replace('{key}', sampleName))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.relatedLinks).to.have.length(ZERO);
        done();
      });
    });

    it('delete one relatedLink', (done) => {
      api.delete(
        oneDeletePath.replace('{key}', sampleName).replace('{akey}', 'rlink0')
      )
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks)
          .to.have.deep.property('[0].name', 'rlink1');
      })
      .end(done);
    });

    it('delete related link by name', (done) => {
      api.delete(oneDeletePath.replace('{key}', sampleName)
        .replace('{akey}', 'rlink0'))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
      })
      .end(done);
    });
  });
});

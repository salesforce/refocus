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

describe(`api: DELETE ${path}`, () => {
  let sampleId;
  const token = tu.createToken();

  before((done) => {
    u.doSetup()
    .then((samp) => {
      return Sample.create(samp);
    })
    .then((samp) => {
      sampleId = samp.id;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('basic delete', (done) => {
    api.delete(`${path}/${sampleId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, 0)) {
        throw new Error('expecting sample');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      return done();
    });
  });
});
describe('api: samples: DELETE RelatedLinks', () => {
  const token = tu.createToken();
  let sampleId;
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
      sampleId = samp.id;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('delete all related links', (done) => {
    api.delete(allDeletePath.replace('{key}', sampleId))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(0);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('delete one relatedLink', (done) => {
    api.delete(
      oneDeletePath.replace('{key}', sampleId).replace('{akey}', 'rlink0')
    )
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(1);
      expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('delete related link by name', (done) => {
    api.delete(oneDeletePath.replace('{key}', sampleId)
      .replace('{akey}', 'rlink0'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(1);
      expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});

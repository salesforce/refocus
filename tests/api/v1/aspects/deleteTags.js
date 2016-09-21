/**
 * tests/api/v1/aspects/deleteTags.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const allDeletePath = '/v1/aspects/{key}/tags';
const oneDeletePath = '/v1/aspects/{key}/tags/{akey}';

describe(`api: aspects: DELETE tags}`, () => {
  let token;
  let aspId;
  let tagId;

  const n = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    tags: [
      { name: 'tag0', associatedModelName: 'Aspect' },
      { name: 'tag1', associatedModelName: 'Aspect' },
    ]
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    Aspect.create(n, { include: Aspect.getAspectAssociations().tags })
    .then((asp) => {
      aspId = asp.id;
      tagId = asp.tags[0].id;
      done();
    })
    .catch((err) => done(err));
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('delete all tags', (done) => {
    api.delete(allDeletePath.replace('{key}', aspId))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(0);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('delete one tag', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', tagId))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.deep.property('[0].id');
      expect(res.body.tags).to.have.deep.property('[0].name', 'tag1');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('delete tag by name', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', 'tag0'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.deep.property('[0].id');
      expect(res.body.tags).to.have.deep.property('[0].name', 'tag1');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('error if tag not found', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', 'x'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

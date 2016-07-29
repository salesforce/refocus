/**
 * tests/api/v1/subjects/deleteTags.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Subject = tu.db.Subject;
const allDeletePath = '/v1/subjects/{key}/tags';
const oneDeletePath = '/v1/subjects/{key}/tags/{akey}';

describe(`api: subjects: DELETE tags}`, () => {
  const token = tu.createToken();
  let i;
  let tag0;

  const n = {
    name: `${tu.namePrefix}NorthAmerica`,
    tags: [
      { name: 'tag0', associatedModelName: 'Subject' },
      { name: 'tag1', associatedModelName: 'Subject' },
    ]
  };

  beforeEach((done) => {
    Subject.create(n, { include: Subject.getSubjectAssociations().tags })
    .then((subj) => {
      i = subj.id;
      tag0 = subj.tags[0].id;
      done();
    })
    .catch((err) => done(err));
  });
  afterEach(u.forceDelete);

  it('delete all tags', (done) => {
    api.delete(allDeletePath.replace('{key}', i))
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
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', tag0))
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
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'tag0'))
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
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'x'))
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

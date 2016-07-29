/**
 * tests/api/v1/subjects/getPublishHierarchy.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';
const expect = require('chai').expect;

describe(`api: GET ${path}:`, () => {
  const token = tu.createToken();

  let gp = { name: `${tu.namePrefix}America`, isPublished: true };
  let par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  let chi = { name: `${tu.namePrefix}Canada`, isPublished: false };
  let grn = { name: `${tu.namePrefix}Quebec`, isPublished: false };

  const aspectTemp = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
  };
  const aspectHumid = {
    name: 'humidity',
    timeout: '30s',
    isPublished: true,
  };

  const sample1 = { value: '10' };
  const sample2 = { value: '10' };

  before((done) => {
    Subject.create(gp)
    .then((subj) => {
      gp = subj;
      par.parentId = gp.id;
      return Subject.create(par);
    })
    .then((subj) => {
      par = subj;
      chi.parentId = par.id;
      sample1.subjectId = subj.id;
      sample2.subjectId = subj.id;
      return Subject.create(chi);
    })
    .then((subj) => {
      chi = subj;
      grn.parentId = chi.id;
      return Subject.create(grn);
    })
    .then((subj) => {
      grn = subj;
      return tu.db.Aspect.create(aspectHumid);
    })
    .then((a) => {
      sample2.aspectId = a.id;
      return tu.db.Aspect.create(aspectTemp);
    })
    .then((a) => {
      sample1.aspectId = a.id;
      return tu.db.Sample.create(sample1);
    })
    .then(() => {
      return tu.db.Sample.create(sample2);
    })
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  describe('isPublished flag:', () => {
    it('hierarchy at gp level should contain parent as a child', (done) => {
      api.get(path.replace('{key}', gp.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.children).to.not.equal(null);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].name).to
                  .equal(`${tu.namePrefix}NorthAmerica`);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('hierarchy at parent level should have no children', (done) => {
      api.get(path.replace('{key}', par.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.children).to.be.empty;
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('nothing should be found at the child level', (done) => {
      api.get(path.replace('{key}', chi.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('nothing should be found at the grn child level', (done) => {
      api.get(path.replace('{key}', chi.id))
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
});

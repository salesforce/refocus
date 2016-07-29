/**
 * tests/api/v1/perspectives/get.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;

describe(`api: GET ${path}`, () => {
  let lensId;
  let perspectiveId;
  let perspectiveName;
  const token = tu.createToken();

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: 'testPersp',
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      lensId = createdPersp.lensId;
      perspectiveId = createdPersp.id;
      perspectiveName = createdPersp.name;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('basic get', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(1);
      expect(res.body).to.have.deep.property('[0].id');
      expect(res.body).to.have.deep.property(
        '[0].rootSubject', 'myMainSubject'
      );
      expect(res.body).to.have.deep.property('[0].lensId', lensId);
      expect(res.body[0].aspectFilter).to.eql(['temperature', 'humidity']);
      expect(res.body[0].aspectTagFilter).to.eql(['temp', 'hum']);
      expect(res.body[0].subjectTagFilter).to.eql(['ea', 'na']);
      expect(res.body[0].statusFilter).to.eql(['Critical', '-OK']);

      return done();
    });
  });

  it('basic get by id', (done) => {
    api.get(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal('testPersp');
      expect(res.body.rootSubject).to.equal('myMainSubject');
      expect(res.body.lensId).to.equal(lensId);
      expect(res.body.aspectFilter).to.eql(['temperature', 'humidity']);
      expect(res.body.aspectTagFilter).to.eql(['temp', 'hum']);
      expect(res.body.subjectTagFilter).to.eql(['ea', 'na']);
      expect(res.body.statusFilter).to.eql(['Critical', '-OK']);

      return done();
    });
  });

  it('basic get by name', (done) => {
    api.get(`${path}/${perspectiveName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal('testPersp');
      expect(res.body.rootSubject).to.equal('myMainSubject');
      expect(res.body.lensId).to.equal(lensId);
      expect(res.body.aspectFilter).to.eql(['temperature', 'humidity']);
      expect(res.body.aspectTagFilter).to.eql(['temp', 'hum']);
      expect(res.body.subjectTagFilter).to.eql(['ea', 'na']);
      expect(res.body.statusFilter).to.eql(['Critical', '-OK']);
      return done();
    });
  });
});

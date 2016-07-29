/**
 * tests/api/v1/subjects/postRelatedLinks.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/aspects';
const expect = require('chai').expect;

describe(`api: POST ${path}`, () => {
  const token = tu.createToken();
  after(u.forceDelete);

  it('post aspect with relatedLinks', (done) => {
    const aspectToPost = {
      name: `${tu.namePrefix}HeartRate`,
      timeout: '110s',
    };
    const relatedLinks = [{ name: 'link1', url: 'https://samples.com' },
      { name: 'link2', url: 'https://samples.com' }
      ];
    aspectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(aspectToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('posting aspect with duplicate relatedLinks should fail', (done) => {
    const aspectToPost = {
      name: `${tu.namePrefix}Pressure`,
      timeout: '110s',
    };
    const relatedLinks = [{ name: 'link1', url: 'https://samples.com' },
      { name: 'link1', url: 'https://samples.com' }
      ];
    aspectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(aspectToPost)
    .expect((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[0].message)
        .to.contain('Name of the relatedlinks should be unique');
      expect(res.body.errors[0].source).to.contain('relatedLinks');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('post aspect with relatedLinks of size zero', (done) => {
    const aspectToPost = {
      name: `${tu.namePrefix}Weight`,
      timeout: '110s',
    };
    const relatedLinks = [];
    aspectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(aspectToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });
});

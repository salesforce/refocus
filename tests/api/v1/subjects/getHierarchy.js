/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/getHierarchy.js
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

describe(`tests/api/v1/subjects/getHierarchy.js, GET ${path} >`, () => {
  let token;
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };
  const aspect = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
    rank: 10,
  };
  const sample1 = { value: '10' };
  let ipar = 0;
  let ichi = 0;
  let igrn = 0;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
    })
    .then(() => {
      chi.parentId = ipar;
      return Subject.create(chi);
    })
    .then((subj) => {
      ichi = subj.id;
      grn.parentId = ichi;
      return Subject.create(grn);
    })
    .then((sub) => {
      sample1.subjectId = sub.id;
      igrn = sub.id;
      return tu.db.Aspect.create(aspect);
    })
    .then((a) => {
      sample1.aspectId = a.id;
      return tu.db.Sample.create(sample1);
    })
    .then((samp) => {
      sample1.id = samp.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('subject hierarchy with samples >', () => {
    it('should be an empty object at the parent level', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.be.empty;
      })
      .end(done);
    });

    it('should be a non empty object at the grandchild level', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children[0].children[0].samples).to.be
          .an('array');
        expect(res.body.children[0].children[0].samples).to.not
          .empty;
      })
      .end(done);
    });

    it('aspect rank must be included in the hierarchy', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children[0].children[0].samples).to.be
          .an('array');
        expect(res.body.children[0].children[0].samples).to.have.lengthOf(1);
        expect(res.body.children[0].children[0].samples[0].aspect.rank).
          to.equal(10);
      })
      .end(done);
    });

    it('should be a non empty object at the 1st  of grandchild', (done) => {
      api.get(path.replace('{key}', igrn))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.not.empty;
      })
      .end(done);
    });

    it('the hierarchy content should be gzipped by default', (done) => {
      api.get(path.replace('{key}', igrn))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect('content-encoding', 'gzip')
      .end(done);
    });
  });

  it('by id', (done) => {
    api.get(path.replace('{key}', ipar))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      // parent level
      expect(res.body.samples).to.be.an('array');
      expect(res.body.children).to.have.length(res.body.childCount);

      // child level
      expect(res.body.children[0].samples).to.be.an('array');
      expect(res.body.children[0].children).to.be.an('array');
      expect(res.body.children[0].children).to.have
        .length(res.body.children[0].childCount);
    })
    .end(done);
  });

  it('by abs path', (done) => {
    api.get(path.replace('{key}', par.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      // parent level
      expect(res.body.samples).to.be.an('array');
      expect(res.body.children).to.have.length(res.body.childCount);

      // child level
      expect(res.body.children[0].samples).to.be.an('array');
      expect(res.body.children[0].children).to.be.an('array');
      expect(res.body.children[0].children).to.have
        .length(res.body.children[0].childCount);
    })
    .end(done);
  });

  it('by abs path not found', (done) => {
    api.get(path.replace('{key}', 'x'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });

  describe('depth tests >', () => {
    it('no depth', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children[0]).to.be
          .an('object');
      })
      .end(done);
    });

    it('depth = -1', (done) => {
      const pth = path.replace('{key}', ipar);
      const rex =
        /Request validation failed\: Parameter \(depth\) is less than the configured minimum \(0\)\: -1/; // jscs:ignore maximumLineLength
      api.get(`${pth}?depth=-1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        if (!rex.test(res.error.text)) {
          throw new Error('Expecting validation failure');
        }
      })
      .end(done);
    });

    it('depth = 0', (done) => {
      const pth = path.replace('{key}', ipar);
      api.get(`${pth}?depth=0`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children[0]).to.be.an('object');
      })
      .end(done);
    });

    it('depth = 1', (done) => {
      const pth = path.replace('{key}', ipar);
      api.get(`${pth}?depth=1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children).to.equal(undefined);
      })
      .end(done);
    });

    it('depth = 2', (done) => {
      const pth = path.replace('{key}', ipar);
      api.get(`${pth}?depth=2`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children[0]).to.have.property('name');
      })
      .end(done);
    });

    it('depth = 3', (done) => {
      const pth = path.replace('{key}', ipar);
      api.get(`${pth}?depth=3`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children[0]).to.have.property('name');
      })
      .end(done);
    });

    it('depth = 99', (done) => {
      const pth = path.replace('{key}', ipar);
      api.get(`${pth}?depth=99`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].children[0]).to.have.property('name');
      })
      .end(done);
    });
  });

  describe('fields param >', () => {
    it('by id', (done) => {
      api.get(path.replace('{key}', ipar) + '?fields=name')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body)
        .to.have.all.keys(['name', 'id', 'samples', 'children', 'apiLinks']);
        done();
      });
    });

    it('by abs path', (done) => {
      api.get(path.replace('{key}', par.name) + '?fields=name')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body)
        .to.have.all.keys(['name', 'id', 'samples', 'children', 'apiLinks']);
        done();
      });
    });
  });
});

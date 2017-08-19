/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/delete.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;
const path = '/v1/aspects';
const allDeletePath = '/v1/aspects/{key}/relatedLinks';
const oneDeletePath = '/v1/aspects/{key}/relatedLinks/{akey}';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe('tests/api/v1/aspects/delete.js >', () => {
  describe(`DELETE ${path} >`, () => {
    let aspectId;
    let token;

    /**
     * Throws error if response object's
     * isDeleted value <= 0
     * @param {Object} res THe response object
     */
    function bodyCheckIfDeleted(res) {
      expect(res.body.isDeleted).to.be.above(ZERO);
    }

    /**
     * Throws error if aspect created for test
     * was returned.
     */
    function notFound() {
      Aspect.findById(aspectId)
      .then((aspect) => {
        expect(aspect).to.equal(null);
      });
    }

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      Aspect.create(u.toCreate)
      .then((aspect) => {
        aspectId = aspect.id;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('with same name and different case succeeds', (done) => {
      api.delete(`${path}/${u.toCreate.name.toLowerCase()}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect(bodyCheckIfDeleted)
      .expect(notFound)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(u.toCreate.name);
        done();
      });
    });

    it('delete by id', (done) => {
      api.delete(`${path}/${aspectId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect(bodyCheckIfDeleted)
      .expect(notFound)
      .end(done);
    });

    it('delete by name', (done) => {
      api.delete(`${path}/${u.toCreate.name}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect(bodyCheckIfDeleted)
      .expect(notFound)
      .end(done);
    });

    it('try doing a delete where you send a body');

    it('try doing a delete without passing the id or absolutePath as extra ' +
    'path on the url');

    it('try deleting a non-existent id');

    it('try deleting a non-existent absolutePath');

    it('try doing a delete with some query params on the url');
  });

  describe('DELETE RelatedLinks >', () => {
    let token;
    let i;

    const n = {
      name: `${tu.namePrefix}ASPECTNAME`,
      timeout: '110s',
      relatedLinks: [
        { name: 'rlink0', url: 'https://samples.com' },
        { name: 'rlink1', url: 'https://samples.com' },
      ],
    };

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      Aspect.create(n)
      .then((asp) => {
        i = asp.id;
        done();
      })
      .catch(done);
    });
    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('delete all related links', (done) => {
      api.delete(allDeletePath.replace('{key}', i))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ZERO);
      })
      .end(done);
    });

    it('delete one relatedLink', (done) => {
      api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'rlink0'))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
      })
      .end(done);
    });

    it('delete related link by name', (done) => {
      api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'rlink0'))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
      })
      .end(done);
    });
  });

  describe('with samples >', () => {
    let aspectId;
    let token;

    const subjectToCreateSecond = {
      description: 'this is sample description',
      help: {
        email: 'sample@bar.com',
        url: 'http://www.bar.com/a0',
      },
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: true,
      name: `${tu.namePrefix}TEST_SUBJECT1`,
    };

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      const samp1 = { value: '1' };
      const samp2 = { value: '2' };
      Aspect.create(u.toCreate)
      .then((a) => {
        aspectId = a.id;
        samp1.aspectId = a.id;
        samp2.aspectId = a.id;
        return tu.db.Subject.create(u.subjectToCreate);
      })
      .then((s1) => {
        samp1.subjectId = s1.id;
        return tu.db.Subject.create(subjectToCreateSecond);
      })
      .then((s2) => {
        samp2.subjectId = s2.id;
      })
      .then(() => {
        Sample.create(samp1);
        Sample.create(samp2);
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('deleting aspect deletes its samples', (done) => {
      api.delete(`${path}/${aspectId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect(() => {
        Sample.findAll()
        .then((samp) => {
          expect(samp).to.have.length(ZERO);
        })
        .catch(done);
      })
      .end(done);
    });
  });
});

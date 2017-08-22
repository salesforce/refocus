/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe(`tests/api/v1/subjects/get.js, GET ${path} >`, () => {
  let token;

  const na = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
    sortBy: '_1',
  };
  const us = {
    name: `${tu.namePrefix}UnitedStates`,
    description: 'country',
    tags: ['US'],
    sortBy: '_a',
  };
  const vt = {
    name: `${tu.namePrefix}Vermont`,
    description: 'state',
    tags: ['US', 'NE'],
    sortBy: '_b',
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Subject.create(na)
    .then((createdNa) => {
      na.id = createdNa.id;
      us.parentId = na.id;
      return Subject.create(us);
    })
    .then((createdUs) => {
      us.id = createdUs.id;
      vt.parentId = us.id;
      return Subject.create(vt);
    })
    .then((createdVt) => {
      vt.id = createdVt.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('duplicate tags fail >', () => {
    it('GET with tag EXCLUDE filter', (done) => {
      api.get(`${path}?tags=-US,-US`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end(done);
    });

    it('GET with tag EXCLUDE filter :: different case tags', (done) => {
      api.get(`${path}?tags=-US,-us`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end(done);
    });

    it('GET with tag INCLUDE filter', (done) => {
      api.get(`${path}?tags=US,US`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end(done);
    });

    it('GET with tag INCLUDE filter :: different case tags', (done) => {
      api.get(`${path}?tags=US,us`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end(done);
    });
  });

  it('Check return result of get in alphabetical order of' +
  'absolutePath by default', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO].absolutePath).to.equal(na.name);
      expect(res.body[ONE].absolutePath).to.equal(na.name + '.' + us.name);
      expect(res.body[TWO].absolutePath)
        .to.equal(na.name + '.' + us.name + '.' + vt.name);
      done();
    });
  });

  it('Check return result of get in alphabetical order of' +
  'sortBy when use of ?sort=sortBy', (done) => {
    api.get(`${path}?sort=sortBy`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO].sortBy).to.equal(na.sortBy);
      expect(res.body[ONE].sortBy).to.equal(us.sortBy);
      expect(res.body[TWO].sortBy).to.equal(vt.sortBy);
      done();
    });
  });

  it('Check return result of get in alphabetical order of' +
  'name when use of ?sort=name', (done) => {
    api.get(`${path}?sort=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO].name).to.equal(na.name);
      expect(res.body[ONE].name).to.equal(us.name);
      expect(res.body[TWO].name).to.equal(vt.name);
      done();
    });
  });

  it('Check return result of get in alphabetical order of' +
  'name when use of ?sort=-name', (done) => {
    api.get(`${path}?sort=-name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[TWO].name).to.equal(na.name);
      expect(res.body[ONE].name).to.equal(us.name);
      expect(res.body[ZERO].name).to.equal(vt.name);
      done();
    });
  });

  it('GET returns parentAbsolutePath, from root', (done) => {
    api.get(`${path}/${na.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const result = JSON.parse(res.text);
      expect(Object.keys(result)).to.contain('parentAbsolutePath');
      expect(result.parentAbsolutePath).to.equal.null;
      done();
    });
  });

  it('GET with different case absolutePath succeeds', (done) => {
    api.get(`${path}/${na.name.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.absolutePath).to.equal(na.name);
      done();
    });
  });

  it('GET returns parentAbsolutePath, from one level down', (done) => {
    api.get(`${path}/${us.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const absPath = res.body.absolutePath;

      // get up to last period
      const expectedParAbsPath =
        absPath.slice(ZERO, absPath.lastIndexOf('.'));

      const result = JSON.parse(res.text);
      expect(Object.keys(result)).to.contain('parentAbsolutePath');
      expect(result.parentAbsolutePath).to.equal(expectedParAbsPath);
      done();
    });
  });

  it('GET returns parentAbsolutePath, from two levels down', (done) => {
    api.get(`${path}/${vt.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const absPath = res.body.absolutePath;

      // get up to last period
      const expectedParAbsPath =
        absPath.slice(ZERO, absPath.lastIndexOf('.'));

      const result = JSON.parse(res.text);
      expect(Object.keys(result)).to.contain('parentAbsolutePath');
      expect(result.parentAbsolutePath).to.equal(expectedParAbsPath);
      done();
    });
  });

  it('GET with tag EXCLUDE filter :: single tag', (done) => {
    api.get(`${path}?tags=-NE`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(TWO);
      done();
    });
  });

  it('GET with tag EXCLUDE filter :: multiple tags missing ' +
    '- on subsequent tag should still EXCLUDE successfully', (done) => {
    api.get(`${path}?tags=-US,-NE`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].tags).to.deep.equal([]);
      done();
    });
  });

  it('GET with tag EXCLUDE filter :: multiple tags', (done) => {
    api.get(`${path}?tags=-US,-NE`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].tags).to.deep.equal([]);
      done();
    });
  });

  it('GET with INCLUDE tag filter :: one tag', (done) => {
    api.get(`${path}?tags=US`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(TWO);
      expect(res.body[ZERO].tags).to.eql(['US']);
      expect(res.body[ONE].tags).to.eql(['US', 'NE']);
      done();
    });
  });

  it('GET with INCLUDE tag filter :: multiple tags', (done) => {
    api.get(`${path}?tags=NE,US`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].tags).to.eql(['US', 'NE']);
      done();
    });
  });

  it('GET with tag filter :: tag field not included', (done) => {
    api.get(`${path}?tags=NE&fields=isPublished,name,sortBy`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].name).to.eql(vt.name);
      expect(res.body[ZERO]).to.not.have.property('tags');
      expect(res.body[ZERO]).to.have.all
        .keys(['apiLinks', 'id', 'isPublished', 'name', 'sortBy']);
      done();
    });
  });

  it('GET with tag EXCLUDE filter :: single tag :: limit=3', (done) => {
    api.get(`${path}?tags=-NE&limit=3`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(TWO);
      done();
    });
  });

  it('GET with tag EXCLUDE filter :: multiple tags :: limit=3', (done) => {
    api.get(`${path}?tags=-US,-NE&limit=3`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].tags).to.deep.equal([]);
      done();
    });
  });

  it('GET with INCLUDE tag filter :: one tag :: limit=3', (done) => {
    api.get(`${path}?tags=US&limit=3`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(TWO);
      expect(res.body[ZERO].tags).to.eql(['US']);
      expect(res.body[ONE].tags).to.eql(['US', 'NE']);
      done();
    });
  });

  it('GET with INCLUDE tag filter :: one tag :: limit=1', (done) => {
    api.get(`${path}?tags=US&limit=1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      done();
    });
  });

  it('GET with INCLUDE tag filter :: multiple tags :: limit=3', (done) => {
    api.get(`${path}?tags=NE,US&limit=3`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].tags).to.eql(['US', 'NE']);
      done();
    });
  });

  it('returns expected fields when passing ?fields=...', (done) => {
    api.get(`${path}?fields=isPublished,name,sortBy`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO]).to.not.have.property('absolutePath');
      expect(res.body[ZERO]).to.have.all
        .keys(['apiLinks', 'id', 'isPublished', 'name', 'sortBy']);
      done();
    });
  });

  it('returns expected fields when passing no fields=...', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO]).to.have.property('sortBy');
      done();
    });
  });

  it('returns expected fields when not passing sortBy parameter...', (done) => {
    api.get(`${path}?fields=isPublished,name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO]).to.not.have.property('sortBy');
      done();
    });
  });

  it('returns expected fields when requesting tags field', (done) => {
    api.get(`${path}?fields=isPublished,name,tags`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO]).to.have.property('tags');
      expect(res.body[ZERO]).to.have.property('name');
      expect(res.body[ZERO]).to.have.property('isPublished');
      done();
    });
  });

  it('pagination tests');
  it('childCount, descendentCount');
  it('by id');
  it('by abs path');
  it('returns expected fields when NOT passing ?fields=...');
});

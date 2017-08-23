/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const path = '/v1/aspects';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;

describe('tests/api/v1/aspects/get.js >', () => {
  let token;
  const EXPECTED_ARR = ['toot', 'poop'];
  const toCreate = [
    {
      description: 'this is a0 description',
      helpEmail: 'a0@bar.com',
      helpUrl: 'http://www.bar.com/a0',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: true,
      name: `${tu.namePrefix}a0`,
      timeout: '30s',
      valueLabel: 'ms',
      valueType: 'NUMERIC',
      rank: 2,
      tags: ['foo', 'baz', 'foo-bar'],
    }, {
      description: 'this is a1 description',
      helpEmail: 'a1@bar.com',
      helpUrl: 'http://www.bar.com/a1',
      imageUrl: 'http://www.bar.com/a1.jpg',
      isPublished: false,
      name: `${tu.namePrefix}a1`,
      timeout: '1m',
      valueLabel: '%',
      valueType: 'PERCENT',
      rank: 1,
      tags: ['bar', 'baz'],
    },
    {
      description: 'this is a2 description',
      helpEmail: 'a1@bar.com',
      helpUrl: 'http://www.bar.com/a1',
      imageUrl: 'http://www.bar.com/a1.jpg',
      isPublished: false,
      name: `${tu.namePrefix}a2`,
      timeout: '1m',
      rank: 3,
      tags: EXPECTED_ARR,
    },
  ];

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.bulkCreate(toCreate)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('filter with tags >', () => {
    it('filter by single EXCLUDE tags returns expected values', (done) => {
      api.get(path + '?tags=-foo')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(TWO);
        expect(res.body[0].tags).to.not.contain('foo');
        expect(res.body[1].tags).to.not.contain('foo');
      })
      .end(done);
    });

    it('filter by multiple EXCLUDE tags returns expected values', (done) => {
      api.get(path + '?tags=-foo,bar')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].tags).to.not.contain('foo');
        expect(res.body[0].tags).to.not.contain('bar');
      })
      .end(done);
    });

    it('filter by single INCLUDE tags returns single aspect', (done) => {
      api.get(path + '?tags=foo')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].tags).to.contain('foo');
      })
      .end(done);
    });

    it('filter by multiple INCLUDE tags returns no aspects', (done) => {
      api.get(path + '?tags=foo,bar')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {

        // none of aspects contain BOTH foo and bar tags
        expect(res.body.length).to.equal(ZERO);
      })
      .end(done);
    });

    it('filter by multiple INCLUDE tags returns aspects with both tags', (done) => {
      api.get(path + '?tags=toot,poop')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].tags).to.deep.equal(EXPECTED_ARR);
      })
      .end(done);
    });

    it('filter by single INCLUDE tags - tag has dash', (done) => {
      api.get(path + '?tags=foo-bar')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].tags).to.contain('foo');
      })
      .end(done);
    });

    it('filter by single EXCLUDE tags - tag has dash', (done) => {
      api.get(path + '?tags=-foo-bar')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(TWO);
        expect(res.body[0].tags).to.contain('bar');
      })
      .end(done);
    });

    it('filter with tags - tag field not included', (done) => {
      api.get(`${path}?tags=foo&fields=name,description`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].name).to.equal(`${tu.namePrefix}a0`);
        expect(res.body[0]).to.not.have.property('tags');
        expect(res.body[0])
        .to.have.all.keys(['apiLinks', 'id', 'name', 'description']);
        return done();
      });
    });

    it('filter by tags with limit 1', (done) => {
      api.get(path + '?tags=baz&limit=1')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
      })
      .end(done);
    });

    it('filter by tags with limit 2', (done) => {
      api.get(path + '?tags=baz&limit=2')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(TWO);
      })
      .end(done);
    });

    it('filter by tags with limit 3', (done) => {
      api.get(path + '?tags=baz&limit=3')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(TWO);
      })
      .end(done);
    });

    it('filter by single EXCLUDE tags with limit', (done) => {
      api.get(path + '?tags=-foo&limit=3')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(TWO);
        expect(res.body[0].tags).to.not.contain('foo');
        expect(res.body[1].tags).to.not.contain('foo');
      })
      .end(done);
    });

    it('filter by multiple EXCLUDE tags with limit', (done) => {
      api.get(path + '?tags=-foo,bar&limit=3')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].tags).to.not.contain('foo');
        expect(res.body[0].tags).to.not.contain('bar');
      })
      .end(done);
    });

    it('filter by single INCLUDE tags with limit', (done) => {
      api.get(path + '?tags=foo&limit=3')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].tags).to.contain('foo');
      })
      .end(done);
    });

    it('filter by multiple INCLUDE tags with limit', (done) => {
      api.get(path + '?tags=foo,bar&limit=3')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {

        // none of aspects contain BOTH foo and bar tags
        expect(res.body.length).to.equal(ZERO);
      })
      .end(done);
    });

    it('filter by multiple INCLUDE tags with limit', (done) => {
      api.get(path + '?tags=toot,poop&limit=3')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(ONE);
        expect(res.body[0].tags).to.deep.equal(EXPECTED_ARR);
      })
      .end(done);
    });

  });

  describe('filter with duplicate tags fail >', () => {
    it('EXCLUDE filter', (done) => {
      api.get(`${path}?tags=-Foo,-Foo`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('DuplicateFieldError');
        return done();
      });
    });

    it('EXCLUDE filter case-sensitive', (done) => {
      api.get(`${path}?tags=-Foo,foo`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('DuplicateFieldError');
        return done();
      });
    });

    it('INCLUDE filter', (done) => {
      api.get(`${path}?tags=Foo,Foo`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('DuplicateFieldError');
        return done();
      });
    });

    it('INCLUDE filter case-sensitive', (done) => {
      api.get(`${path}?tags=Foo,foo`)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('DuplicateFieldError');
        return done();
      });
    });
  });

  describe('Single Values >', () => {
    it('filter by BOOLEAN returns expected values', (done) => {
      api.get(path + '?valueType=PERCENT') // BOOLEAN is default
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.be.equal(ONE);
        expect(res.body[ZERO].valueType).to.be.equal('PERCENT');
      })
      .end(done);
    });

    it('key used twice in url', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0&description=foo&name=xyz`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end(done);
    });

    it('no asterisk is treated as "equals"', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ONE) ||
          res.body[ZERO].name !== `${tu.namePrefix}a0`) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end(done);
    });

    it('with same name and different case succeeds', (done) => {
      const name = toCreate[ZERO].name;
      api.get(path + '?name=' + name.toUpperCase())
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[ZERO].name).to.equal(name);
        return done();
      });
    });

    it('trailing asterisk is treated as "starts with"', (done) => {
      api.get(`${path}?name=${tu.namePrefix}*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.be.equal(THREE);
        res.body.map((aspect) => {
          expect(aspect.name.slice(ZERO, THREE)).to.equal(tu.namePrefix);
        });
      })
      .end(done);
    });

    it('leading asterisk is treated as "ends with"', (done) => {
      api.get(`${path}?name=*a1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ONE) ||
          res.body[ZERO].name !== `${tu.namePrefix}a1`) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end(done);
    });

    it('leading and trailing asterisks are treated as "contains"', (done) => {
      api.get(`${path}?name=*_a*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, THREE)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end(done);
    });

    it('multiple asterisks treated as wildcards', (done) => {
      api.get(`${path}?name=***foo`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ZERO)) {
          throw new Error('expecting 0 aspects');
        }
      })
      .end(done);
    });

    it('inner asterisks are treated as wildcards', (done) => {
      api.get(`${path}?name=foo*bar`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ZERO)) {
          throw new Error('expecting 0 aspects');
        }
      })
      .end(done);
    });

    it('url encoding', (done) => {
      api.get(`${path}?description=this%20is%20a0%20description`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ONE)) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end(done);
    });
  }); // Single Values

  describe('Lists >', () => {
    it('no wildcards', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0,${tu.namePrefix}a1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, TWO)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end(done);
    });

    it('with wildcards', (done) => {
      api.get(`${path}?name=*a*,${tu.namePrefix}*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.be.equal(THREE);
        res.body.map((aspect) => {
          expect(aspect.name).to.contain('a');
        });
      })
      .end(done);
    });
  }); // Lists

  describe('Aspect Sorting by rank >', () => {
    it('sort ascending', (done) => {
      api.get(`${path}?sort=rank`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(THREE);
        expect(res.body[ZERO].rank).to.equal(ONE);
        expect(res.body[ONE].rank).to.equal(TWO);
        expect(res.body[TWO].rank).to.equal(THREE);

        return done();
      });
    });

    it('sort descending', (done) => {
      api.get(`${path}?sort=-rank`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(THREE);
        expect(res.body[ZERO].rank).to.equal(THREE);
        expect(res.body[ONE].rank).to.equal(TWO);
        expect(res.body[TWO].rank).to.equal(ONE);

        return done();
      });
    });
  }); // aspect rank
});

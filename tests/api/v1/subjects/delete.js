/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/delete.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const expect = require('chai').expect;
const allDeletePath = '/v1/subjects/{key}/relatedLinks';
const oneDeletePath = '/v1/subjects/{key}/relatedLinks/{akey}';

describe('tests/api/v1/subjects/delete.js >', () => {
  describe(`DELETE ${path} >`, () => {
    let token;

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    after(tu.forceDeleteUser);

    describe('Childless Subjects >', () => {
      const n = { name: `${tu.namePrefix}NorthAmerica` };
      let i = 0;

      function bodyCheckIfDeleted(res) {
        const errors = [];
        if (res.body.isDeleted === 0) {
          errors.push(new Error('isDeleted should be > 0'));
        }

        if (errors.length) {
          throw new Error(errors);
        }
      }

      function notFound() {
        const errors = [];
        Subject.findByPk(i)
        .then((subj) => {
          if (subj) {
            errors.push(new Error('should not have found a record with this id'));
          }
        });
        if (errors.length) {
          throw new Error(errors);
        }
      }

      beforeEach((done) => {
        Subject.create(n)
        .then((subj) => {
          i = subj.id;
          done();
        })
        .catch(done);
      });

      beforeEach(u.populateRedis);

      afterEach(u.forceDelete);

      it('delete childless subject by id', (done) => {
        api.delete(`${path}/${i}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect(bodyCheckIfDeleted)
        .expect(notFound)
        .end(done);
      });

      it('delete childless subject by absolutePath, different case',
      (done) => {
        api.delete(`${path}/${n.name.toLowerCase()}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect(bodyCheckIfDeleted)
        .expect(notFound)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.absolutePath).to.equal(n.name);
          done();
        });
      });

      it('delete childless subject by absolutePath', (done) => {
        api.delete(`${path}/${n.name}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect(bodyCheckIfDeleted)
        .expect(notFound)
        .end(done);
      });

      it('delete where you send a body');

      it('delete without id or absolutePath on the url');

      it('try deleting a non-existent id');

      it('try deleting a non-existent absolutePath');

      it('try doing a delete with some query params on the url');
    }); // Childless Subjects

    describe('Subjects with Children and Grandchildren >', () => {
      const par = { name: `${tu.namePrefix}NorthAmerica` };
      const chi = { name: `${tu.namePrefix}Canada` };
      const grn = { name: `${tu.namePrefix}Quebec` };
      let ipar = 0;
      let ichi = 0;
      let igrn = 0;

      function parentBodyCheckIfDeleted(res) {
        const errors = [];

        if (res.body.name !== par.name) {
          errors.push(new Error(`name should be ${par.name}`));
        }

        if (res.body.hierarchyLevel !== 1) {
          errors.push(new Error('hierarchyLevel should be 1'));
        }

        if (res.body.parentId) {
          errors.push(new Error('parentId should be null'));
        }

        if (res.body.absolutePath !== par.name) {
          errors.push(new Error(`absolutePath should be ${par.name}`));
        }

        if (res.body.isDeleted === 0) {
          errors.push(new Error('isDeleted should be > 0'));
        }

        if (errors.length) {
          throw new Error(errors);
        }
      }

      function childBodyCheckIfDeleted(res) {
        const errors = [];
        if (res.body.name !== chi.name) {
          errors.push(new Error(`name should be ${chi.name}`));
        }

        if (res.body.absolutePath !== `${par.name}.${res.body.name}`) {
          const msg = `absolutePath should be ${par.name}.${res.body.name}`;
          errors.push(new Error(msg));
        }

        if (res.body.isDeleted === 0) {
          errors.push(new Error('isDeleted should be > 0'));
        }

        if (errors.length) {
          throw new Error(errors);
        }
      }

      function grandchildBodyCheckIfDeleted(res) {
        const errors = [];
        if (res.body.isDeleted === 0) {
          errors.push(new Error('isDeleted should be > 0'));
        }

        if (errors.length) {
          throw new Error(errors);
        }
      }

      function parentNotFound() {
        Subject.findByPk({
          where: {
            id: ipar,
            isDeleted: 0,
          },
        })
        .then((subj) => {
          if (subj) {
            throw new Error('should not have found a record with this id');
          }
        });
      }

      function childNotFound() {
        Subject.findOne({
          where: {
            id: ichi,
            isDeleted: 0,
          },
        })
        .then((subj) => {
          if (subj) {
            throw new Error('should not have found a record with this id');
          }
        });
      }

      function grandchildNotFound() {
        Subject.findOne({
          where: {
            id: igrn,
            isDeleted: 0,
          },
        })
        .then((subj) => {
          if (subj) {
            throw new Error('should not have found a record with this id');
          }
        });
      }

      beforeEach((done) => {
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
        .then((subj) => {
          igrn = subj.id;
          done();
        })
        .catch(done);
      });

      afterEach(u.forceDelete);

      it('cannot delete subject with child (using id)', (done) => {
        api.delete(`${path}/${ipar}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.FORBIDDEN)
        .expect(/SubjectDeleteConstraintError/)
        .end(done);
      });

      it('cannot delete subject with child (using absolutePath)', (done) => {
        api.delete(`${path}/${par.name}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.FORBIDDEN)
        .expect(/SubjectDeleteConstraintError/)
        .end(done);
      });

      it('can delete grandchild then child then parent (using ids)', (done) => {
        api.delete(`${path}/${igrn}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect(grandchildBodyCheckIfDeleted)
        .expect(grandchildNotFound)
        .end((err /* , res */) => {
          if (err) {
            return done(err);
          }

          api.delete(`${path}/${ichi}`)
          .set('Authorization', token)
          .expect(constants.httpStatus.OK)
          .expect(childBodyCheckIfDeleted)
          .expect(childNotFound)
          .end((err2 /* , res */) => {
            if (err2) {
              return done(err2);
            }

            api.delete(`${path}/${ipar}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect(parentBodyCheckIfDeleted)
            .expect(parentNotFound)
            .end((/* err, res */) => done());
          });
        });
      });

      it('can delete grandchild then child then parent (using absolutePaths)',
      (done) => {
        api.delete(`${path}/${par.name}.${chi.name}.${grn.name}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect(grandchildBodyCheckIfDeleted)
        .expect(grandchildNotFound)
        .end((err /* , res */) => {
          if (err) {
            return done(err);
          }

          api.delete(`${path}/${par.name}.${chi.name}`)
          .set('Authorization', token)
          .expect(constants.httpStatus.OK)
          .expect(childBodyCheckIfDeleted)
          .expect(childNotFound)
          .end((err2 /* , res */) => {
            if (err2) {
              return done(err2);
            }

            api.delete(`${path}/${par.name}`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .expect(parentBodyCheckIfDeleted)
            .expect(parentNotFound)
            .end((/* err, res */) => {
              done();
            });
          });
        });
      });
    }); // Subjects with Children and Grandchildren
  });

  describe('DELETE relatedLinks >', () => {
    let token;
    let i;
    const n = {
      name: `${tu.namePrefix}NorthAmerica`,
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
      Subject.create(
        n
      )
      .then((subj) => {
        i = subj.id;
        done();
      })
      .catch(done);
    });
    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('delete all relatedLinks', (done) => {
      api.delete(allDeletePath.replace('{key}', i))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(0);
      })
      .end(done);
    });

    it('delete related link by name', (done) => {
      api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'rlink0'))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(1);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
      })
      .end(done);
    });
  });
});

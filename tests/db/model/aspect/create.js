/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;

describe('tests/db/model/aspect/create.js >', () => {
  afterEach(u.forceDelete);

  describe('field check >', () => {
    it('default values', (done) => {
      let asp;
      const toCreate = u.getSmall();
      delete toCreate.isPublished;
      Aspect.create(toCreate)
      .then((a) => {
        asp = a;
        const o = a.get({ plain: true });
        if (o &&
          o.description === null &&
          o.helpEmail === null &&
          o.helpUrl === null &&
          o.id !== null &&
          Number(o.isDeleted) === Number(0) &&
          o.imageUrl === null &&
          o.isPublished === false &&
          o.name === u.name &&
          o.criticalRange === null &&
          o.warningRange === null &&
          o.infoRange === null &&
          o.okRange === null &&
          o.timeout === '1s' &&
          o.valueLabel === null &&
          o.valueType === 'BOOLEAN' &&
          /* TODO once we have users, expect createdBy to be populated */
          o.createdBy === null &&
          o.updatedAt !== null &&
          o.createdAt !== null &&
          o.deletedAt === null) {
          return;
        }

        throw new Error('expecting default values for everything but name ' +
          'and timeout');
      })
      .then(() => asp.tags)
      .then((tags) => {
        if (tu.gotArrayWithExpectedLength(tags, 0)) {
          return;
        }

        throw new Error('expecting tags to be empty array');
      })
      .then(() => asp.relatedLinks)
      .then((relatedLinks) => {
        if (tu.gotArrayWithExpectedLength(relatedLinks, 0)) {
          return;
        }

        throw new Error('expecting relatedLinks to be empty array');
      })
      .then(() => asp.getSamples())
      .then((samples) => {
        if (tu.gotArrayWithExpectedLength(samples, 0)) {
          return;
        }

        throw new Error('expecting samples to be empty array');
      })
      .then(() => {
        done();
      })
      .catch(done);
    });

    describe('description >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.description = '';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.description === '') {
            done();
          } else {
            done(new Error('aspect should be created with an empty string ' +
              'for "description"'));
          }
        })
        .catch(done);
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.description = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.description === null) {
            done();
          } else {
            done(new Error('aspect should be created with a null ' +
              '"description"'));
          }
        })
        .catch(done);
      });

      it('provide a string with length = 4096', (done) => {
        const ln = 4096;
        let d = '';
        while (d.length < ln) {
          d += 'z';
        }

        if (d.length !== ln) {
          throw new Error();
        }

        const toCreate = u.getSmall();
        toCreate.description = d;
        Aspect.create(toCreate)
        .then((o) => {
          if (ln === o.description.length) {
            return done();
          }

          done(new Error('aspect should be created with a 4096-character ' +
            '"description"'));
        })
        .catch(done);
      });

      it('provide a string with length > 4096', (done) => {
        const ln = 4097;
        let d = '';
        while (d.length < ln) {
          d += 'z';
        }

        if (d.length !== ln) {
          throw new Error();
        }

        const toCreate = u.getSmall();
        toCreate.description = d;
        Aspect.create(toCreate)
        .then(() => done(tu.seqDbError))
        .catch((err) => {
          if (err.name === tu.seqDbErrorName &&
            err.message === 'value too long for type character varying(4096)') {
            return done();
          }

          done(tu.seqDbError);
        });
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.description = ['a', 'b'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'description cannot be an array or an ' +
              'object' &&
            err.errors[0].path === 'description') {
            return done();
          }

          done(tu.valError);
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.description = { a: 'b' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'description cannot be an array or an ' +
              'object' &&
            err.errors[0].path === 'description') {
            return done();
          }

          done(tu.valError);
        });
      });
    }); // description

    describe('helpEmail >', () => {
      it('provide an empty string, same as null', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpEmail = '';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.helpEmail === null) {
            return done();
          }

          done(new Error('helpEmail should be null'));
        })
        .catch(done);
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpEmail = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.helpEmail === null) {
            return done();
          }

          done(new Error('helpEmail should be null'));
        })
        .catch(done);
      });

      it('provide a string with length = 74', (done) => {
        const ln = 74;
        let e = 'z@gmail.com';
        while (e.length < ln) {
          e = `z${e}`;
        }

        if (e.length !== ln) {
          throw new Error('must be 74 characters');
        }

        const toCreate = u.getSmall();
        toCreate.helpEmail = e;
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotExpectedLength(o.helpEmail, ln)) {
            return done();
          }

          done(new Error('helpEmail length should be 74 characters'));
        })
        .catch(done);
      });

      it('provide a string with length > 74', (done) => {
        const ln = 75;
        let e = 'z@gmail.com';
        while (e.length < ln) {
          e = `z${e}`;
        }

        if (e.length !== ln) {
          throw new Error('must be 75 characters');
        }

        const toCreate = u.getSmall();
        toCreate.helpEmail = e;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase())
          .to.contain('validation isemail failed');
          done();
        })
        .catch(done);
      });

      it('provide a string which is not email-address-y', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpEmail = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase())
          .to.contain('validation isemail failed');
          done();
        })
        .catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpEmail = ['foo@bar.com', 'bar@foo.com'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 2) &&
            err.errors[0].message === 'helpEmail cannot be an array or an ' +
              'object' &&
            err.errors[0].type === 'string violation' &&
            err.errors[0].path === 'helpEmail' &&
            err.errors[1].message === 'Validation isEmail failed' &&
            err.errors[1].type === 'Validation error' &&
            err.errors[1].path === 'helpEmail') {
            return done();
          }

          done(tu.valError);
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpEmail = { a: 'foo@bar.com' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 2) &&
            err.errors[0].message === 'helpEmail cannot be an array or an ' +
              'object' &&
            err.errors[0].type === 'string violation' &&
            err.errors[0].path === 'helpEmail' &&
            err.errors[1].message === 'Validation isEmail failed' &&
            err.errors[1].type === 'Validation error' &&
            err.errors[1].path === 'helpEmail') {
            return done();
          }

          done(tu.valError);
        });
      });
    });

    describe('helpUrl >', () => {
      it('provide an empty string, same as null', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpUrl = '';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.helpUrl === null) {
            return done();
          }

          done(new Error('aspect should be created with a null "helpUrl"'));
        })
        .catch(done);
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpUrl = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.helpUrl === null) {
            return done();
          }

          done(new Error('aspect should be created with a null "helpUrl"'));
        })
        .catch(done);
      });

      it('provide a string with length = 2082', (done) => {
        const ln = 2082;
        let x = '';
        while (x.length < ln - 15) {
          x = `z${x}`;
        }

        const url = `http://www.${x}.com`;
        if (url.length !== ln) {
          throw new Error('must be 2082 characters');
        }

        const toCreate = u.getSmall();
        toCreate.helpUrl = url;
        Aspect.create(toCreate)
        .then((o) => {
          if (ln === o.helpUrl.length) {
            return done();
          }

          done(new Error('aspect should be created with a 2082-character ' +
            '"helpUrl"'));
        })
        .catch(done);
      });

      it('provide a string with length > 2082', (done) => {
        const ln = 2083;
        let x = '';
        while (x.length < ln - 15) {
          x = `z${x}`;
        }

        const url = `http://www.${x}.com`;
        if (url.length !== ln) {
          throw new Error('must be 2083 characters');
        }

        const toCreate = u.getSmall();
        toCreate.helpUrl = url;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase())
          .to.contain('validation isurl failed');
          done();
        }).catch(done);
      });

      it('provide a string which is not url-y', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpUrl = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase())
          .to.contain('validation isurl failed');
          done();
        }).catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpUrl = ['http://www.google.com', 'www.salesforce.com'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase())
          .to.contain('validation isurl failed');
          done();
        }).catch(done);
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.helpUrl = { a: 'www.salesforce.com' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase())
          .to.contain('validation isurl failed');
          done();
        }).catch(done);
      });
    });

    describe('id >', () => {
      it('provide a null id', (done) => {
        const toCreate = u.getSmall();
        toCreate.id = null;
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'null value in column "id" violates not-null ' +
              'constraint') {
            return done();
          }

          done(u.dbError);
        });
      });

      it('provide a string id', (done) => {
        const toCreate = u.getSmall();
        toCreate.id = 'x';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'invalid input syntax for uuid: "x"') {
            return done();
          }

          done(u.dbError);
        });
      });

      it('provide a numeric id', (done) => {
        const toCreate = u.getSmall();
        toCreate.id = 1;
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'column "id" is of type uuid but expression is ' +
              'of type integer') {
            return done();
          }

          done(u.dbError);
        });
      });

      it('provide an id that is already an aspect id', (done) => {
        const toCreateA = u.getSmall();
        Aspect.create(toCreateA)
        .then((o0) => {
          const toCreateB = u.getSmall();
          toCreateB.name = `${u.name}xxx`;
          toCreateB.id = o0.id;
          return Aspect.create(toCreateB);
        })
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.uniErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'id must be unique' &&
            err.errors[0].type === 'unique violation' &&
            err.errors[0].path === 'id') {
            return done();
          }

          done(tu.uniError);
        });
      });
    });

    describe('isDeleted >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.isDeleted = '';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'invalid input syntax for integer: ""') {
            return done();
          }

          done(err);
        });
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.isDeleted = null;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'isDeleted cannot be null' &&
            err.errors[0].type === 'notNull Violation' &&
            err.errors[0].path === 'isDeleted' &&
            err.errors[0].value === null) {
            return done();
          }

          done(err);
        });
      });

      it('provide a string value', (done) => {
        const toCreate = u.getSmall();
        toCreate.isDeleted = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'invalid input syntax for integer: "abcdefg"') {
            return done();
          }

          done(err);
        });
      });

      it('provide a string value which is a number', (done) => {
        const toCreate = u.getSmall();
        toCreate.isDeleted = '100';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.isDeleted === '100') {
            return done();
          }

          done(new Error('should have accepted a number-ish string'));
        })
        .catch(done);
      });

      it('provide a number', (done) => {
        const toCreate = u.getSmall();
        toCreate.isDeleted = 100000000;
        Aspect.create(toCreate)
        .then((o) => {
          if (Number(o.isDeleted) === Number(100000000)) {
            return done();
          }

          done(new Error('should have accepted a number'));
        })
        .catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.isDeleted = [0];
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'column "isDeleted" is of type bigint but ' +
              'expression is of type integer[]') {
            return done();
          }

          done(u.dbError);
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.isDeleted = { a: 0 };
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch(() => done());
      });
    });

    describe('imageUrl >', () => {
      it('provide an empty string, same as null', (done) => {
        const toCreate = u.getSmall();
        toCreate.imageUrl = '';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.helpUrl === null) {
            return done();
          }

          done(new Error('aspect should be created with a null "imageUrl"'));
        })
        .catch(done);
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.imageUrl = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.helpUrl === null) {
            done();
          } else {
            done(new Error('aspect should be created with a null "imageUrl"'));
          }
        })
        .catch(done);
      });

      it('provide a string with length = 2082', (done) => {
        const ln = 2082;
        let x = '';
        while (x.length < ln - 15) {
          x = `z${x}`;
        }

        const url = `http://www.${x}.com`;
        if (url.length !== ln) {
          throw new Error('must be 2082 characters');
        }

        const toCreate = u.getSmall();
        toCreate.imageUrl = url;
        Aspect.create(toCreate)
        .then((o) => {
          if (ln === o.imageUrl.length) {
            done();
          } else {
            done(new Error('aspect should be created with a 2082-character ' +
              '"imageUrl"'));
          }
        })
        .catch(done);
      });

      it('provide a string with length > 2082', (done) => {
        const ln = 2083;
        let x = '';
        while (x.length < ln - 15) {
          x = `z${x}`;
        }

        const url = `http://www.${x}.com`;
        if (url.length !== ln) {
          throw new Error('must be 2083 characters');
        }

        const toCreate = u.getSmall();
        toCreate.imageUrl = url;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase()).to.contain('validation isurl ' +
            'failed');
          done();
        }).catch(done);
      });

      it('provide a string which is not url-y', (done) => {
        const toCreate = u.getSmall();
        toCreate.imageUrl = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase()).to.contain('validation isurl ' +
            'failed');
          done();
        }).catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.imageUrl = ['http://www.google.com', 'www.salesforce.com'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('string violation');
          expect(err.message.toLowerCase()).to.contain('imageurl cannot be ' +
            'an array or an object');
          done();
        }).catch(done);
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.imageUrl = { a: 'www.salesforce.com' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('string violation');
          expect(err.message.toLowerCase()).to.contain('imageurl cannot be ' +
            'an array or an object');
          done();
        }).catch(done);
      });
    });

    describe('isPublished >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = '';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'invalid input syntax for type boolean: ""') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = null;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('notnull violation');
          expect(err.message.toLowerCase()).to.contain('ispublished cannot ' +
            'be null');
          done();
        }).catch(done);
      });

      it('provide a string value', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'invalid input syntax for type boolean: ' +
              '"abcdefg"') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide a string value of true', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = 'true';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.isPublished === true) {
            done();
          } else {
            done(new Error('expecting it to treat string "true" like boolean'));
          }
        })
        .catch(done);
      });

      it('provide a string value of false', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = 'false';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.isPublished === false) {
            done();
          } else {
            done(new Error('expecting it to treat string "false" like ' +
              'boolean'));
          }
        })
        .catch(done);
      });

      it('provide a string value of 0', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = '0';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.isPublished === false) {
            done();
          } else {
            done(new Error('expecting it to treat string "0" like boolean'));
          }
        })
        .catch(done);
      });

      it('provide a string value of 1', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = '1';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.isPublished === true) {
            done();
          } else {
            done(new Error('expecting it to treat string "1" like boolean'));
          }
        })
        .catch(done);
      });

      it('provide a numeric value of 1', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = 1;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.isPublished === true) {
            done();
          } else {
            done(new Error('expecting it to treat numeric 1 like boolean'));
          }
        })
        .catch(done);
      });

      it('provide a numeric value of 0', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = 0;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.isPublished === false) {
            done();
          } else {
            done(new Error('expecting it to treat numeric 0 like boolean'));
          }
        })
        .catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = [0];
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'column "isPublished" is of type boolean but ' +
              'expression is of type integer[]') {
            done();
          } else {
            done(u.dbError);
          }
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.isPublished = { a: 0 };
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch(() => done());
      });
    });

    describe('name >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = '';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase()).to.contain('validation is failed');
          done();
        }).catch(done);
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = null;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('notnull violation');
          expect(err.message.toLowerCase()).to.contain('name cannot be null');
          done();
        }).catch(done);
      });

      it('provide a string with valid characters (upper & lowercase letters, ' +
      'numbers, dash and underscore), length = 60', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = `${u.name}01abC_-qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq`;
        Aspect.create(toCreate)
        .then(() => done())
        .catch(done);
      });

      it('provide a string with valid characters but length > 60', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = `${u.name}123456789012345678901qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq`;
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'value too long for type character varying(60)') {
            done();
          } else {
            done(u.dbError);
          }
        });
      });

      it('provide a string with invalid "." (dot) character', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = `${u.name}.aaa`;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase()).to.contain('validation is failed');
          done();
        }).catch(done);
      });

      it('provide a string with invalid "|" (pipe) character', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = `${u.name}|1`;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase()).to.contain('validation is failed');
          done();
        }).catch(done);
      });

      it('provide a string with invalid " " (space) character', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = `${u.name} a b c`;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          expect(err.message.toLowerCase()).to.contain('validation is failed');
          done();
        }).catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = ['MyAspect'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('string violation');
          expect(err.message.toLowerCase()).to.contain('name cannot be an ' +
            'array or an object');
          done();
        }).catch(done);
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.name = { x: 'MyAspect' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('string violation');
          expect(err.message.toLowerCase()).to.contain('name cannot be an ' +
            'array or an object');
          done();
        }).catch(done);
      });
    });

    describe('criticalRange >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = '';
        Aspect.create(toCreate)
        .then(() => done(u.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          done();
        });
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.criticalRange === null) {
            done();
          } else {
            done(new Error('expecting null ok'));
          }
        })
        .catch(done);
      });

      it('provide a string', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = { a: [0, 1] };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide a number', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = 99;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with string elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = ['a', 'b'];
        Aspect.create(toCreate)
        .then(() => done(u.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.errors[0].path).to.equal('criticalRange');
          done();
        });
      });

      it('provide an array with object elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [{ a: 0 }, { b: 1 }];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch(() => done());
      });

      it('provide an array with array elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [[0, 1], [1, 2]];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with zero numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with one numeric element', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [1];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with three numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [1, 2, 3];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with two ascending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [100, 1000];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.criticalRange, 2) &&
            o.criticalRange[0] === 100 &&
            o.criticalRange[1] === 1000) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two equal numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [3.1415927, 3.1415927];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.criticalRange, 2) &&
            o.criticalRange[0] === 3.1415927 &&
            o.criticalRange[1] === 3.1415927) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two descending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.criticalRange = [99, 98];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'criticalRange') {
            done();
          } else {
            done(err);
          }
        });
      });
    });

    describe('warningRange >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = '';
        Aspect.create(toCreate)
        .then(() => done(u.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.errors[0].path).to.equal('warningRange');
          done();
        });
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.warningRange === null) {
            done();
          } else {
            done(new Error('expecting null ok'));
          }
        })
        .catch(done);
      });

      it('provide a string', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = { a: [0, 1] };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide a number', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = 99;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with string elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = ['a', 'b'];
        Aspect.create(toCreate)
        .then(() => done(u.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.errors[0].path).to.equal('warningRange');
          done();
        });
      });

      it('provide an array with object elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [{ a: 0 }, { b: 1 }];
        Aspect.create(toCreate)
        .then(() => done(u.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.errors[0].path).to.equal('warningRange');
          done();
        });
      });

      it('provide an array with array elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [[0, 1], [1, 2]];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with zero numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with one numeric element', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [1];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with three numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [1, 2, 3];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with two ascending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [100, 1000];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.warningRange, 2) &&
            o.warningRange[0] === 100 &&
            o.warningRange[1] === 1000) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two equal numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [3.1415927, 3.1415927];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.warningRange, 2) &&
            o.warningRange[0] === 3.1415927 &&
            o.warningRange[1] === 3.1415927) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two descending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.warningRange = [99, 98];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'warningRange') {
            done();
          } else {
            done(err);
          }
        });
      });
    });

    describe('infoRange >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = '';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch(() => done());
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.infoRange === null) {
            done();
          } else {
            done(new Error('expecting null ok'));
          }
        })
        .catch(done);
      });

      it('provide a string', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = { a: [0, 1] };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide a number', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = 99;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with string elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = ['a', 'b'];
        Aspect.create(toCreate)
        .then(() => done(u.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.errors[0].path).to.equal('infoRange');
          done();
        });
      });

      it('provide an array with object elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [{ a: 0 }, { b: 1 }];
        Aspect.create(toCreate)
        .then(() => done(u.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.errors[0].path).to.equal('infoRange');
          done();
        });
      });

      it('provide an array with array elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [[0, 1], [1, 2]];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with zero numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with one numeric element', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [1];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with three numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [1, 2, 3];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with two ascending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [100, 1000];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.infoRange, 2) &&
            o.infoRange[0] === 100 &&
            o.infoRange[1] === 1000) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two equal numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [3.1415927, 3.1415927];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.infoRange, 2) &&
            o.infoRange[0] === 3.1415927 &&
            o.infoRange[1] === 3.1415927) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two descending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.infoRange = [99, 98];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'infoRange') {
            done();
          } else {
            done(err);
          }
        });
      });
    });

    describe('okRange >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = '';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch(() => done());
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.okRange === null) {
            done();
          } else {
            done(new Error('expecting null ok'));
          }
        })
        .catch(done);
      });

      it('provide a string', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = 'abcdefg';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = { a: [0, 1] };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide a number', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = 99;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with string elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = ['a', 'b'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch(() => done());
      });

      it('provide an array with object elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [{ a: 0 }, { b: 1 }];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch(() => done());
      });

      it('provide an array with array elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [[0, 1], [1, 2]];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with zero numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with one numeric element', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [1];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with three numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [1, 2, 3];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'A non-null range ' +
              'must include two elements' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide an array with two ascending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [100, 1000];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.okRange, 2) &&
            o.okRange[0] === 100 &&
            o.okRange[1] === 1000) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two equal numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [3.1415927, 3.1415927];
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotArrayWithExpectedLength(o.okRange, 2) &&
            o.okRange[0] === 3.1415927 &&
            o.okRange[1] === 3.1415927) {
            done();
          } else {
            done(new Error('expecting ok'));
          }
        })
        .catch(done);
      });

      it('provide an array with two descending numeric elements', (done) => {
        const toCreate = u.getSmall();
        toCreate.okRange = [99, 98];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'The second element in the range must ' +
              'be greater than or equal to the first element' &&
            err.errors[0].type === 'Validation error' &&
            err.errors[0].path === 'okRange') {
            done();
          } else {
            done(err);
          }
        });
      });
    });

    describe('timeout >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = '';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          done();
        }).catch(done);
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = null;
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('notnull violation');
          expect(err.message.toLowerCase())
            .to.contain('timeout cannot be null');
          done();
        })
        .catch(done);
      });

      it('provide a string with length = 10', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = '123456789M';
        Aspect.create(toCreate)
        .then(() => done())
        .catch(done);
      });

      it('provide a string with length > 10', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = '1234567890d';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          done();
        }).catch(done);
      });

      it('provide a string without a leading [0-9]', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = 's';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          done();
        }).catch(done);
      });

      it('provide a string without a trailing [SMHDsmhd]', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = '99';
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('validation error');
          done();
        }).catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = ['1d'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('string violation');
          expect(err.message.toLowerCase()).to.contain('timeout cannot be ' +
            'an array or an object');
          done();
        }).catch(done);
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.timeout = { x: '2M' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          expect(err.name).to.equal(tu.valErrorName);
          expect(err.message.toLowerCase()).to.contain('string violation');
          expect(err.message.toLowerCase()).to.contain('timeout cannot ' +
              'be an array or an object');
          done();
        }).catch(done);
      });
    });

    describe('valueLabel >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueLabel = '';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.valueLabel === '') {
            done();
          } else {
            done(new Error('aspect should be created with an empty string ' +
              'for "valueLabel"'));
          }
        })
        .catch(done);
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueLabel = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.valueLabel === null) {
            done();
          } else {
            done(new Error('aspect should be created with a null ' +
              '"valueLabel"'));
          }
        })
        .catch(done);
      });

      it('provide a string with length = 10', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueLabel = 'abcdefghij';
        Aspect.create(toCreate)
        .then((o) => {
          if (tu.gotExpectedLength(o.valueLabel, 10)) {
            done();
          } else {
            done(new Error('aspect should be created with a 10-character ' +
              '"valueLabel"'));
          }
        })
        .catch(done);
      });

      it('provide a string with length > 10', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueLabel = 'abcdefghijk';
        Aspect.create(toCreate)
        .then(() => done(tu.seqDbError))
        .catch((err) => {
          if (err.name === tu.seqDbErrorName &&
            err.message === 'value too long for type character varying(10)') {
            done();
          } else {
            done(tu.seqDbError);
          }
        });
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueLabel = ['a', 'b'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'valueLabel cannot be an array or an ' +
              'object' &&
            err.errors[0].path === 'valueLabel') {
            done();
          } else {
            done(tu.valError);
          }
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueLabel = { a: 'b' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.valErrorName &&
            tu.gotArrayWithExpectedLength(err.errors, 1) &&
            err.errors[0].message === 'valueLabel cannot be an array or an ' +
              'object' &&
            err.errors[0].path === 'valueLabel') {
            done();
          } else {
            done(tu.valError);
          }
        });
      });
    });

    describe('valueType >', () => {
      it('provide an empty string', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = '';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'invalid input value for enum ' +
              '"enum_Aspects_valueType": ""') {
            done();
          } else {
            done(err);
          }
        });
      });

      it('provide a null value', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = null;
        Aspect.create(toCreate)
        .then((o) => {
          if (o.valueType === null) {
            done();
          } else {
            done(new Error('aspect should be created with a null "valueType"'));
          }
        })
        .catch(done);
      });

      it('provide an array', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = ['BOOLEAN', 'PERCENT'];
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'column "valueType" is of type ' +
              '"enum_Aspects_valueType" but expression is of type text[]') {
            done();
          } else {
            done(tu.valError);
          }
        });
      });

      it('provide an object', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = { a: 'NUMERIC' };
        Aspect.create(toCreate)
        .then(() => done(tu.valError))
        .catch(() => done());
      });

      it('provide a string with valid enum value BOOLEAN', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = 'BOOLEAN';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.valueType === 'BOOLEAN') {
            done();
          } else {
            done(new Error('aspect should be created with valueType BOOLEAN'));
          }
        })
        .catch(done);
      });

      it('provide a string with valid enum value NUMERIC', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = 'NUMERIC';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.valueType === 'NUMERIC') {
            done();
          } else {
            done(new Error('aspect should be created with valueType NUMERIC'));
          }
        })
        .catch(done);
      });

      it('provide a string with valid enum value PERCENT', (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = 'PERCENT';
        Aspect.create(toCreate)
        .then((o) => {
          if (o.valueType === 'PERCENT') {
            done();
          } else {
            done(new Error('aspect should be created with valueType PERCENT'));
          }
        })
        .catch(done);
      });

      it('provide a string with a string which is an invalid  enum value',
      (done) => {
        const toCreate = u.getSmall();
        toCreate.valueType = 'XXXXXXXX';
        Aspect.create(toCreate)
        .then(() => done(u.dbError))
        .catch((err) => {
          if (err.name === tu.dbErrorName &&
            err.message === 'invalid input value for enum ' +
              '"enum_Aspects_valueType": "XXXXXXXX"') {
            done();
          } else {
            done(err);
          }
        });
      });
    });
  }); // field checks

  describe('duplicate names >', () => {
    it('provide a name already in use, other aspect is not deleted', (done) => {
      Aspect.create(u.getSmall())
      .then(() => Aspect.create(u.getSmall()))
      .catch((err) => {
        expect(err.name).to.equal(tu.uniErrorName);
        done();
      });
    });

    it('provide a name already in use by a soft-deleted aspect', (done) => {
      Aspect.create(u.getSmall())
      .then((o) => o.destroy())
      .then(() => Aspect.create(u.getSmall()))
      .then(() => done())
      .catch(() => done(tu.uniError));
    });

    it('provide a name already in use, other aspect is hard-deleted',
    (done) => {
      Aspect.create(u.getSmall())
      .then((o) => o.destroy({ force: true }))
      .then(() => Aspect.create(u.getSmall()))
      .then(() => done())
      .catch(() => done(tu.uniError));
    });
  }); // duplicate names

  describe('associations >', () => {
    describe('tags >', () => {
      it('create with one tag', (done) => {
        const asp = u.getSmall();
        asp.tags = ['___foo'];
        Aspect.create(asp)
        .then((o) => {
          if (o.tags &&
            tu.gotArrayWithExpectedLength(o.tags, 1) &&
            o.tags[0] === '___foo') {
            done();
          } else {
            done(new Error('expecting a tag'));
          }
        })
        .catch(done);
      });

      it('create with two tags', (done) => {
        const asp = u.getSmall();
        asp.tags = ['___foo', '___bar'];
        Aspect.create(asp)
        .then((o) => o.tags)
        .then((t) => {
          if (tu.gotArrayWithExpectedLength(t, 2)) {
            done();
          } else {
            done(new Error('expecting two tags'));
          }
        })
        .catch(done);
      });

      it('create with a tag name that already exists, ' +
        'should fail because ' +
        'http://docs.sequelizejs.com/en/latest/docs/associations/ says: ' +
        '"An instance can be created with nested association in one step, ' +
        'provided all elements are new." ');
    }); // tags

    describe('createdBy: >', () => {
      it('provide an existing user id');
      it('provide an aspect id');
      it('provide a null user id');
      it('provide an empty string');
      it('provide a number');
      it('provide an object');
      it('provide an array');
      it('provide a string (e.g. XXXXX)');
    }); // createdBy

    describe('relatedLinks >', () => {
      it('create with one relatedLink');
      it('create with two relatedLinks');
    }); // relatedLinks
  }); // associations
});

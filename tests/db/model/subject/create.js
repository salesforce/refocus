/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const constants = require('../../../../db/constants');

describe('tests/db/model/subject/create.js >', () => {
  after(u.forceDelete);

  describe('Simple Subjects, i.e. no parents/children >', () => {
    it('ok, simple subject', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}1`, null);
      Subject.create(s)
      .then((o) => {
        expect(o).to.have.property('id');
        expect(o).to.have.property('description')
        .to.equal('description description description description     ');
        expect(o).to.have.property('helpEmail').to.equal('foo@bar.com');
        expect(o).to.have.property('helpUrl')
        .to.equal('http://www.bar.com');
        expect(o).to.have.property('imageUrl')
        .to.equal('http://www.bar.com/foo.jpg');
        expect(o).to.have.property('name').to.equal(`${tu.namePrefix}1`);
        expect(o).to.have.property('parentId').to.equal(null);
        expect(o).to.have.property('parentAbsolutePath').to.equal(null);
        done();
      })
      .catch(done);
    });

    it('ok, unknown attribute is ignored', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}2`, null);
      s.x = 'abcdefg';
      Subject.create(s)
      .then((o) => {
        expect(o).to.have.property('id');
        expect(o).to.not.have.property('x');
        done();
      })
      .catch(done);
    });

    it('should fail, missing name', (done) => {
      const s = u.getSubjectPrototype('', null);
      delete s.name;
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since name is not provided'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, null name', (done) => {
      const s = u.getSubjectPrototype(null, null);
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since name is null'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, invalid type for name', (done) => {
      const s = u.getSubjectPrototype(['a', 'b', 'c'], null);
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since name is an array'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, empty string for name', (done) => {
      const s = u.getSubjectPrototype('', null);
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since name is an empty string'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, name too long', (done) => {
      const s =
        u.getSubjectPrototype('abcdefghijklmnopqrstuvwxabcde' +
            'fghijklmnopqrstuvwxabcdefghijklmnopqrstuvwx', null);
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since name is too long'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, invalid value for name', (done) => {
      const s = u.getSubjectPrototype('LKJH$%', null);
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since name contains invalid ' +
          'characters'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, space in name', (done) => {
      const s = u.getSubjectPrototype('My Name', null);
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since name contains invalid ' +
          'characters'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, invalid value for sort by', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}sortByContainsInvalidCharacters`, null);
      s.sortBy = 'x@yz123$';
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since sort by contains invalid ' +
          'characters'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, space in sort by', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}sortByWithSpaces`, null);
      s.sortBy = 'abc xyz';
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since sort by contains space '));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('should fail, sort by too long', (done) => {
      var invalidLengthSortBy = new Array(constants.fieldlen.sortField + 10).join('a');
      const s =
        u.getSubjectPrototype(`${tu.namePrefix}sortByWithWrongLength`, null);
      s.sortBy = invalidLengthSortBy;
      Subject.create(s)
      .then(() => {
        done(new Error('should have failed since sort by is too long'));
      })
      .catch((err) => {
        expect(err);
        done();
      });
    });

    it('recreate OK', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}RecreateMe`, null);
      Subject.create(s)
      .then((o) => o.destroy())
      .then(() => Subject.create(s))
      .then(() => done())
      .catch(done);
    });

    it('ok, missing description', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}NoDesc`, null);
      delete s.description;
      Subject.create(s)
      .then((o) => {
        expect(o).to.have.property('description').to.equal(null);
        done();
      })
      .catch(done);
    });

    it('ok, null description', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}NullDesc`, null);
      s.description = null;
      Subject.create(s)
      .then((o) => {
        expect(o).to.have.property('description').to.equal(null);
        done();
      })
      .catch(done);
    });

    it('ok, missing helpEmail and helpUrl', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}NoHelp`, null);
      delete s.helpUrl;
      delete s.helpEmail;
      Subject.create(s)
      .then((o) => {
        expect(o).to.have.property('helpEmail').to.equal(null);
        expect(o).to.have.property('helpUrl').to.equal(null);
        done();
      })
      .catch(done);
    });

    it('ok, missing imageUrl', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}NoImage`, null);
      delete s.imageUrl;
      Subject.create(s)
      .then((o) => {
        expect(o).to.have.property('imageUrl').to.equal(null);
        done();
      })
      .catch(done);
    });

    it('ok, missing isPublished defaults to false', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}NoIsPubl`, null);
      delete s.isPublished;
      Subject.create(s)
      .then((o) => {
        expect(o.dataValues.isPublished)
        .to.be.a('boolean')
        .to.equal(false);
        done();
      })
      .catch(done);
    });

    it('ok, null parentId', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}NullParentId`, null);
      s.parentId = null;
      Subject.create(s)
      .then((o) => {
        expect(o.dataValues.parentId).to.equal(null);
        done();
      })
      .catch(done);
    });

    it('should fail, parentId is not a UUID', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}BadParentId`, null);
      s.parentId = 'SomeString_NotUUID';
      Subject.create(s)
      .then(() => {
        throw new Error('should have failed with invalid parentId');
      })
      .catch((err) => {
        expect(err.name).to.equal(tu.dbErrorName);
        done();
      });
    });

    it('geolocation array must not contain null elements', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}testgeo`);
      s.geolocation = [null, null];
      Subject.create(s)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        expect(err.message.toLowerCase()).to.contain('geolocation');
        done();
      }).catch(done);
    });

    it('geolocation array cannot contain less than two elements', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}testgeo1`);
      s.geolocation = [1.2];
      Subject.create(s)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        expect(err.errors[0].path).to.contain('geolocation');
        done();
      }).catch(done);
    });

    it('geolocation array cannot contain more than two elements', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}testgeo2`);
      s.geolocation = [1.2, 2.3, 8.2];
      Subject.create(s)
      .then(() => done(tu.valError))
      .catch((err) => {
        expect(err.name).to.equal(tu.valErrorName);
        expect(err.message.toLowerCase()).to.contain('validation error');
        expect(err.errors[0].path).to.contain('geolocation');
        done();
      }).catch(done);
    });
  });

  describe('Children >', () => {
    let pId;
    const pName = `${tu.namePrefix}parent`;

    before((done) => {
      const s = u.getSubjectPrototype(pName, null);
      Subject.create(s)
      .then((o) => {
        pId = o.id;
        done();
      })
      .catch(done);
    });

    it('ok, child', (done) => {
      const s = u.getSubjectPrototype(`${tu.namePrefix}child1`, pId);
      Subject.create(s)
      .then((created) => {
        expect(created).to.have.property('id');
        expect(created).to.have.property('description').to.equal(s.description);
        expect(created).to.have.property('helpEmail').to.equal(s.helpEmail);
        expect(created).to.have.property('helpUrl').to.equal(s.helpUrl);
        expect(created).to.have.property('imageUrl').to.equal(s.imageUrl);
        expect(created).to.have.property('name').to.equal(s.name);
        expect(created).to.have.property('parentId').to.equal(s.parentId);
        expect(created).to.have.property('parentAbsolutePath').to.equal(pName);
        expect(created).to.have.property('sortBy').to.equal(s.sortBy);
        done();
      })
      .catch(done);
    });
  });
});

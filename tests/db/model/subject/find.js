/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/find.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const Subject = tu.db.Subject;

describe('tests/db/model/subject/find.js >', () => {
  let id1 = 0;
  let id2 = 0;
  let idDel = 0;
  let pid = 0;

  after(u.forceDelete);

  before((done) => {
    Profile.create({ name: `${tu.namePrefix}Profile` })
    .then((pcreated) => {
      pid = pcreated.id;
    })
    .then(() => Subject.create({ name: `${tu.namePrefix}1` }))
    .then((created1) => {
      id1 = created1.id;
      return Subject.create({ name: `${tu.namePrefix}2` });
    })
    .then((created2) => {
      id2 = created2.id;
      return Subject.create({ name: `${tu.namePrefix}3` });
    })
    .then((created3) => {
      idDel = created3.id;
      return created3.destroy();
    })
    .then(() => Subject.findAll()) // Buffer added because test is too fast
    .then(() => done()) // created3.destroy() doesnt run without buffer
    .catch(done);
  });

  describe('findById >', () => {
    it('should be found', (done) => {
      Subject.findById(id1)
      .then((found) => {
        expect(found).to.have.property('id');
        done();
      })
      .catch(done);
    });

    it('find a profile id, should not be found', (done) => {
      Subject.findById(pid)
      .then((shouldBeNull) => {
        if (shouldBeNull) {
          throw new Error('should be null');
        } else {
          done();
        }
      })
      .catch(done);
    });

    it('find a deleted subject, should not be found', (done) => {
      Subject.findById(idDel)
      .then((shouldBeNull) => {
        if (shouldBeNull) {
          throw new Error('should be null');
        } else {
          done();
        }
      })
      .catch(done);
    });
  });

  describe('findOne >', () => {
    it('ok, just returned one', (done) => {
      Subject.findOne()
      .then((found) => {
        expect(found).to.have.property('id');
        done();
      })
      .catch(done);
    });

    it('ok, none found', (done) => {
      Subject.findOne({
        where: { name: `${tu.namePrefix}foo` },
      })
      .then((shouldBeNull) => {
        if (shouldBeNull) {
          throw new Error('should be null');
        } else {
          done();
        }
      })
      .catch(done);
    });
  });

  describe('findAll >', () => {
    it('ok, found all, not including deleted ones', (done) => {
      Subject.findAll()
      .then((found) => {
        expect(found).to.have.length(2);
        done();
      })
      .catch(done);
    });

    it('ok, found none', (done) => {
      Subject.findAll({ where: { isPublished: true } })
      .then((shouldBeZeroLength) => {
        expect(shouldBeZeroLength).to.have.length(0);
        done();
      })
      .catch(done);
    });

    // Flapping test: The query in this test applies limit first and then sorts
    // the subjects, hence we cannot assert a specific subject name.
    // Ref: https://github.com/sequelize/sequelize/issues/4146
    it('limit', (done) => {
      Subject.findAll({ limit: 1 })
      .then((found) => {
        expect(found).to.have.length(1);

        // TODO expect(found[0]).to.have.property('name').to.equal(`${tu.namePrefix}1`);
        done();
      })
      .catch(done);
    });

    // Flapping test: The query in this test applies limit and offset first and
    // then sorts the result, hence we cannot assert a specific subject name.
    it('offset', (done) => {
      Subject.findAll({ limit: 1, offset: 1 })
      .then((found) => {
        expect(found).to.have.length(1);

        // TODO expect(found[0]).to.have.property('name').to.equal(`${tu.namePrefix}2`);
        done();
      })
      .catch(done);
    });

    // Both tests only compare the numbers not strings.
    it('name (string data type) order asc', (done) => {
      Subject.findAll({ order: ['name'] })
      .then((found) => {
        expect(found).to.have.length(2);
        expect(found[0]).to.have.property('id').to.equal(id1);
        expect(found[1]).to.have.property('id').to.equal(id2);
        done();
      })
      .catch(done);
    });

    it('name (string data type) order desc', (done) => {
      Subject.findAll({ order: [['name', 'DESC']] })
      .then((found) => {
        expect(found).to.have.length(2);
        expect(found[0]).to.have.property('id').to.equal(id2);
        expect(found[1]).to.have.property('id').to.equal(id1);
        done();
      })
      .catch(done);
    });

    it('id (uuid data type) order asc', (done) => {
      Subject.findAll({ order: ['id'] })
      .then((found) => {
        const foundId1 = found[0].dataValues.id;
        const foundId2 = found[1].dataValues.id;
        expect(found).to.have.length(2);
        expect(foundId1).to.be.below(foundId2);
        done();
      })
      .catch(done);
    });

    it('id (uuid data type) order desc', (done) => {
      Subject.findAll({ order: [['id', 'DESC']] })
      .then((found) => {
        expect(found).to.have.length(2);
        const foundId1 = found[0].dataValues.id;
        const foundId2 = found[1].dataValues.id;
        expect(foundId1).to.be.above(foundId2);
        done();
      })
      .catch(done);
    });

    it('createdAt (date data type) order asc', (done) => {
      Subject.findAll({ order: ['createdAt'] })
      .then((found) => {
        const foundId1 = found[0].dataValues.createdAt.getTime();
        const foundId2 = found[1].dataValues.createdAt.getTime();
        expect(found).to.have.length(2);
        expect(foundId1).to.be.below(foundId2);
        done();
      })
      .catch(done);
    });

    it('createdAt (date data type) order desc', (done) => {
      Subject.findAll({ order: [['createdAt', 'DESC']] })
      .then((found) => {
        const foundId1 = found[0].dataValues.createdAt.getTime();
        const foundId2 = found[1].dataValues.createdAt.getTime();
        expect(found).to.have.length(2);
        expect(foundId1).to.be.above(foundId2);
        done();
      })
      .catch(done);
    });

    it('ok, found all, including soft-deleted ones', (done) => {
      Subject.findAll({ paranoid: false })
      .then((found) => {
        expect(found).to.have.length(3);
        done();
      })
      .catch(done);
    });

    it('test out lots of different { where: ... $between} options', (done) => {
      Subject.findAll({ order: ['name'] })
      .then((found) => {
        expect(found[0].dataValues.name).to.equal('___1');
        done();
      })
      .catch(done);
    });

    it('returns correct profile access field name', (done) => {
      expect(Subject.getProfileAccessField()).to.equal('subjectAccess');
      done();
    });
  });
});

/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/upsert.js
 */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('tests/db/model/sample/upsert.js >', () => {
  const aspectName = `${tu.namePrefix}Aspect`;
  const subjectName = `${tu.namePrefix}Subject`;
  const unPublishedSubjectName = `${tu.namePrefix}UnPublishedSubject`;
  const UnPublishedAspectName = `${tu.namePrefix}UnPublishedAspect`;

  afterEach(u.forceDelete);

  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: aspectName,
      timeout: '30s',
      valueType: 'NUMERIC',
    })
    .then(() => Subject.create({
      isPublished: true,
      name: subjectName,
    }))
    .then(() => Subject.create({
      isPublished: false,
      name: unPublishedSubjectName,
    }))
    .then(() => done())
    .catch(done);
  });

  // why is this failing with not null validation err?
  it.skip('when referenced subject is unpublished, CREATE upsert sample should fail',
    (done) => {
    Subject.findOne({ where: { name: unPublishedSubjectName } })
    .then((o) => {
      expect(o.isPublished).to.be.false;
      return Sample.create({
        name: o.name + `|` + aspectName,
        value: '1',
      })
    })
    .then(() => done('expecting to throw ResourceNotFoundError'))
    .catch((err) => {
      expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
      done();
    });
  });

  it('when referenced aspect is unpublished, upsert sample should fail',
    (done) => {
    Aspect.create({
      isPublished: false,
      name: UnPublishedAspectName,
      timeout: '30s',
      valueType: 'NUMERIC',
    })
    .then(() => Sample.upsertByName({
      name: subjectName + `|` + UnPublishedAspectName,
      value: '1',
    }))
    .then(() => done('expecting to throw ResourceNotFoundError'))
    .catch((err) => {
      expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
      done();
    });
  });

  it('when referenced subject is unpublished, upsert sample should fail',
    (done) => {
    Sample.upsertByName({
      name: unPublishedSubjectName + `|` + aspectName,
      value: '1',
    })
    .then(() => done('expecting to throw ResourceNotFoundError'))
    .catch((err) => {
      expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
      done();
    });
  });

  it.only('when sample is new and when it already exists', (done) => {
    Sample.upsertByName({
      name: subjectName + `|` + aspectName,
      value: '1',
    })
    .should.eventually.have.deep.property('value', '1')
    .then(() => Sample.upsertByName({
      name: subjectName + `|` + aspectName,
      value: '2',
    }))
    .should.eventually.have.deep.property('value', '2')
    .then(() => done())
    .catch(done);
  });

  it('When subject name changed then the related samples should be deleted',
  (done) => {
    const updatedSubjectName = subjectName + 1;
    let newSample;
    Sample.upsertByName({
      name: subjectName + `|` + aspectName,
      value: '1',
    })
    .then((samp) => {
      newSample = samp;
    })
    .then(() => Subject.scope({
      method: ['absolutePath', subjectName],
    }).find())
    .then((subject) => subject.update({ name: updatedSubjectName }))
    .then(() => {
      // use delay for getting updated version of sample because it
      // gets updated in afterUpdate. So we receive the change in subject
      // as soon as it gets updated but sample update / heirarchy update
      // it does in background.
      setTimeout(() => {
        Sample.findOne({
          where: {
            name: {
              $iLike: updatedSubjectName + '|' + aspectName,
            },
          },
        })
        .then((sample) => {
          expect(sample).to.equal(null);
          done();
        });
      }, 500);
    })
    .catch(done);
  });

  it('updateAt timestamp should change', (done) => {
    let newSample;
    Sample.upsertByName({
      name: subjectName + '|' + aspectName,
      value: '1',
    })
    .then((samp) => {
      newSample = samp;
    })
    .then(() => Sample.upsertByName({
      name: subjectName + '|' + aspectName,
      value: '1',
    }))
    .then((s) => {
      const newSampleUpdateTime = newSample.dataValues.updatedAt.getTime();
      const updatedSampleUpdateTime = s.dataValues.updatedAt.getTime();
      expect(updatedSampleUpdateTime).to.be.above(newSampleUpdateTime);
    })
    .then(() => done())
    .catch(done);
  });

  it('subject does not exist', (done) => {
    Sample.upsertByName({
      name: subjectName + '|x',
      value: '1',
    })
    .then(() => done('expecting to throw ResourceNotFoundError'))
    .catch((err) => {
      expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
      done();
    });
  });

  it('aspect does not exist', (done) => {
    Sample.upsertByName({
      name: 'x|' + aspectName,
      value: '1',
    })
    .then(() => done('expecting to throw ResourceNotFoundError'))
    .catch((err) => {
      expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
      done();
    });
  });
});

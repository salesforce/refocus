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
  const unPublishedAspectName = `${tu.namePrefix}UnPublishedAspect`;
  let publishedAspectId;
  let unPublishedAspectId;
  let publishedSubjectId;
  let unPublishedSubjectId;

  afterEach(u.forceDelete);

  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: aspectName,
      timeout: '30s',
      valueType: 'NUMERIC',
    })
    .then((a) => {
      publishedAspectId = a.id;
      return Subject.create({
        isPublished: true,
        name: subjectName,
      });
    })
    .then((s) => {
      publishedSubjectId = s.id;
      return Subject.create({
        isPublished: false,
        name: unPublishedSubjectName,
      });
    })
    .then((s) => {
      unPublishedSubjectId = s.id;
      return Aspect.create({
        isPublished: false,
        name: unPublishedAspectName,
        timeout: '30s',
        valueType: 'NUMERIC',
      });
    })
    .then((a) => {
      unPublishedAspectId = a.id;
      done();
    })
    .catch(done);
  });

  describe('published tests:', () => {
    it('when sample is new and when it already exists', (done) => {
      Sample.upsertByName({
        name: subjectName + `|` + aspectName,
        value: '1',
      })
      .then((samp) => {
        expect(samp.value).to.equal('1');
        return Sample.upsertByName({
          name: subjectName + `|` + aspectName,
          value: '2',
        });
      })
      .then((samp) => {
        expect(samp.value).to.equal('2');
        done();
      })
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
  });

  describe('unpublished tests:', () => {
    it('unpublished subject cannot be used to CREATE sample', (done) => {
      Subject.findById(publishedSubjectId)
      .then((s) => s.update({ isPublished: false }))
      .then(() => Sample.upsertByName({
        name: subjectName + `|` + aspectName,
        value: '1',
      }))
      .then(() => done('expecting to throw ResourceNotFoundError'))
      .catch((err) => {
        expect(err.explanation).to.equal('Subject not found.');
        expect(err.name).to.equal('ResourceNotFoundError');
        expect(err.resourceType).to.equal('Subject');
        expect(err.resourceKey).to.equal(publishedSubjectId);
        done();
      })
      .catch(done); // catch expectation failures
    });

    it('when referenced subject is unpublished, CREATE sample should fail',
      (done) => {
      Sample.create({
        subjectId: unPublishedSubjectId,
        aspectId: publishedAspectId,
      })
      .then(() => done('expecting to throw ResourceNotFoundError'))
      .catch((err) => {
        expect(err.explanation).to.equal('Subject not found.');
        expect(err.name).to.equal('ResourceNotFoundError');
        expect(err.resourceType).to.equal('Subject');
        expect(err.resourceKey).to.equal(unPublishedSubjectId);
        done();
      })
      .catch(done); // catch expectation failures
    });

    it('when referenced aspect is unpublished, CREATE sample should fail',
      (done) => {
      Sample.create({
        subjectId: publishedSubjectId,
        aspectId: unPublishedAspectId,
      })
      .then(() => done('expecting to throw ResourceNotFoundError'))
      .catch((err) => {
        expect(err.explanation).to.equal('Aspect not found.');
        expect(err.name).to.equal('ResourceNotFoundError');
        expect(err.resourceType).to.equal('Aspect');
        expect(err.resourceKey).to.equal(unPublishedAspectId);
        done();
      })
      .catch(done);
    });

    it('when referenced aspect is unpublished, UPSERT sample should fail',
      (done) => {
      Sample.upsertByName({
        name: subjectName + `|` + unPublishedAspectName,
        value: '1',
      })
      .then(() => done('expecting to throw ResourceNotFoundError'))
      .catch((err) => {
        expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
        done();
      })
      .catch(done);
    });

    it('when referenced subject is unpublished, UPSERT sample should fail',
      (done) => {
      Sample.upsertByName({
        name: unPublishedSubjectName + `|` + aspectName,
        value: '1',
      })
      .then(() => done('expecting to throw ResourceNotFoundError'))
      .catch((err) => {
        expect(err).to.have.property('name').to.equal('ResourceNotFoundError');
        done();
      })
      .catch(done);
    });
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

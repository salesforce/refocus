/**
 * tests/db/model/sample/sampleNameUpdate.js
 */
'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('sample name gets updated:', () => {
  afterEach(u.forceDelete);

  let a1;
  let a2;
  let b1;
  let b2;
  let b3;

  const xa1 = {
    isPublished: true,
    name: `${tu.namePrefix}Aspect1`,
    timeout: '30s',
    valueType: 'NUMERIC',
  };

  const xa2 = {
    isPublished: true,
    name: `${tu.namePrefix}Aspect2`,
    timeout: '30s',
    valueType: 'NUMERIC',
  };

  const xb1 = {
    isPublished: true,
    name: `${tu.namePrefix}Subject1`,
  };

  const xb2 = {
    isPublished: true,
    name: `${tu.namePrefix}Subject2`,
  };

  const xb3 = {
    isPublished: true,
    name: `${tu.namePrefix}Subject3`,
  };

  beforeEach((done) => {
    Aspect.create(xa1)
    .then((a) => {
      a1 = a;
      return Aspect.create(xa2);
    })
    .then((a) => {
      a2 = a;
      return Subject.create(xb1);
    })
    .then((b) => {
      b1 = b;
      xb2.parentId = b1.id;
      return Subject.create(xb2);
    })
    .then((b) => {
      b2 = b;
      xb3.parentId = b2.id;
      return Subject.create(xb3);
    })
    .then((b) => {
      b3 = b;
      return [
        { aspectId: a1.id, subjectId: b1.id },
        { aspectId: a1.id, subjectId: b2.id },
        { aspectId: a1.id, subjectId: b3.id },
        { aspectId: a2.id, subjectId: b1.id },
        { aspectId: a2.id, subjectId: b2.id },
        { aspectId: a2.id, subjectId: b3.id },
      ];
    })
    .each((s) => Sample.create(s))
    .then(() => done())
    .catch((err) => done(err));
  });

  describe('when subject name/parentId gets updated:', () => {
    it('sample name updated when subject name is updated, ' +
    'when subject parent name is updated, ' +
    'when subject grandparent name is updated', (done) => {
      Subject.findById(b1.id)
      .then((b) => b.update({ name: `${tu.namePrefix}UPDATED` }))
      .then(() => Subject.scope('withSamples').findById(b1.id))
      .then((b) => b.getSamples())
      .each((samp) => {
        samp.get('name').should.match(/$__UDPATED|__Aspect[12]/);
      })
      .then(() => Subject.scope('withSamples').findById(b2.id))
      .then((b) => b.getSamples())
      .each((samp) => {
        samp.get('name').should.match(/$__UDPATED|__Aspect[12]/);
      })
      .then(() => Subject.scope('withSamples').findById(b3.id))
      .then((b) => b.getSamples())
      .each((samp) => {
        samp.get('name').should.match(/$__UDPATED|__Aspect[12]/);
      })
      .then(() => done())
      .catch((err) => done(err));
    });
  });

  describe('when aspect name gets updated', () => {
    it('sample name updated when aspect name is updated', (done) => {
      Aspect.findById(a1.id)
      .then((a) => a.update({ name: `${tu.namePrefix}UPDATED` }))
      .then(() => Aspect.scope('withSamples').findById(a1.id))
      .then((a) => a.getSamples())
      .each((samp) => {
        samp.get('name').should.match(/.*|__UPDATED$/);
      })
      .then(() => done())
      .catch((err) => done(err));
    });
  });
});

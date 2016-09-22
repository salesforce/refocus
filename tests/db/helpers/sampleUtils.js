/**
 * tests/db/helpers/sampleUtils.js
 */
'use strict';

const expect = require('chai').expect;
const sampleUtils = require('../../../db/helpers/sampleUtils');

const testBooleanAspects = {
  criticalTrueOkFalse: {
    criticalRange: [1, 1],
    okRange: [0, 0],
    timeout: '1s',
    valueType: 'BOOLEAN',
  },
  criticalFalseOkTrue: {
    criticalRange: [0, 0],
    okRange: [1, 1],
    timeout: '1s',
    valueType: 'BOOLEAN',
  },
  warningFalseInfoTrue: {
    warningRange: [0, 0],
    infoRange: [1, 1],
    timeout: '1s',
    valueType: 'BOOLEAN',
  },
  multipleTruesCriticalOkFalse: {
    criticalRange: [1, 1],
    warningRange: [1, 1],
    okRange: [0, 0],
    timeout: '1s',
    valueType: 'BOOLEAN',
  },
};

describe('sampleUtils Tests:', () => {
  describe('computeStatus', () => {
    it('criticalTrueOkFalse', () => {
      expect(sampleUtils.computeStatus(
        testBooleanAspects.criticalTrueOkFalse,
        'true')).to.equal('Critical');
      expect(sampleUtils.computeStatus(
        testBooleanAspects.criticalTrueOkFalse,
        'false')).to.equal('OK');
      expect(sampleUtils.computeStatus(
        testBooleanAspects.criticalTrueOkFalse,
        '4')).to.equal('Invalid');
    });

    it('criticalFalseOkTrue', () => {
      expect(sampleUtils.computeStatus(
        testBooleanAspects.criticalFalseOkTrue,
        'false')).to.equal('Critical');
      expect(sampleUtils.computeStatus(
        testBooleanAspects.criticalFalseOkTrue,
        'true')).to.equal('OK');
      expect(sampleUtils.computeStatus(
        testBooleanAspects.criticalFalseOkTrue,
        'Warning')).to.equal('Invalid');
    });

    it('warningFalseInfoTrue', () => {
      expect(sampleUtils.computeStatus(
        testBooleanAspects.warningFalseInfoTrue,
        'false')).to.equal('Warning');
      expect(sampleUtils.computeStatus(
        testBooleanAspects.warningFalseInfoTrue,
        'true')).to.equal('Info');
    });

    it('multipleTruesCriticalOkFalse', () => {
      expect(sampleUtils.computeStatus(
        testBooleanAspects.multipleTruesCriticalOkFalse,
        'true')).to.equal('Critical');
      expect(sampleUtils.computeStatus(
        testBooleanAspects.multipleTruesCriticalOkFalse,
        'false')).to.equal('OK');
    });
  });
});

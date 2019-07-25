/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/utils/common.js
 */

const expect = require('chai').expect;
const validateAtLeastOneFieldPresent = require('../../utils/common')
                                        .validateAtLeastOneFieldPresent;

describe('tests/utils/common.js > ', () => {
  describe('validateAtLeastOneFieldPresent > ', () => {
    it('Error, both null arguments', (done) => {
      const obj = null;
      const arr = null;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object null, arr undefined', (done) => {
      const obj = null;
      const arr = undefined;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object null, arr empty', (done) => {
      const obj = null;
      const arr = [];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object null, arr non empty', (done) => {
      const obj = null;
      const arr = ['elem1'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object undefined, arr null', (done) => {
      const obj = undefined;
      const arr = null;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object empty, arr null', (done) => {
      const obj = {};
      const arr = null;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object non empty, arr null', (done) => {
      const obj = { attr1: 'value1' };
      const arr = null;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object undefined, arr undefined', (done) => {
      const obj = undefined;
      const arr = undefined;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object undefined, arr empty', (done) => {
      const obj = undefined;
      const arr = [];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object undefined, arr non empty', (done) => {
      const obj = undefined;
      const arr = ['elem1'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object empty, arr undefined', (done) => {
      const obj = {};
      const arr = undefined;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object non empty, arr undefined', (done) => {
      const obj = { attr1: 'val1' };
      const arr = undefined;
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'The arguments cannot be null or undefined'
        );
        done();
      }
    });

    it('Error, object wrong type', (done) => {
      const obj = [];
      const arr = [];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'Invalid argument type'
        );
        done();
      }
    });

    it('Error, array wrong type', (done) => {
      const obj = {};
      const arr = {};
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'Invalid argument type'
        );
        done();
      }
    });

    it('Error, object and array empty', (done) => {
      const obj = {};
      const arr = [];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'Fields array cannot be empty'
        );
        done();
      }
    });

    it('Error, object non empty and array empty', (done) => {
      const obj = { attr1: 'value1' };
      const arr = [];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'Fields array cannot be empty'
        );
        done();
      }
    });

    it('Error, object empty and array one element', (done) => {
      const obj = {};
      const arr = ['elem1'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'At least one these attributes are required: elem1'
        );
        done();
      }
    });

    it('Error, object and array one element, no intersection', (done) => {
      const obj = { attr1: 'value1' };
      const arr = ['elem1'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'At least one these attributes are required: elem1'
        );
        done();
      }
    });

    it('OK, array one element, one intersection', (done) => {
      const obj = { elem1: 'value1' };
      const arr = ['elem1'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('Error, array multiple elements, no intersection', (done) => {
      const obj = { field1: 'value1', field2: 'value2', field3: 'value3' };
      const arr = ['elem1', 'elem2', 'elem3'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.explanation).to.be.equal(
          'At least one these attributes are required: elem1,elem2,elem3'
        );
        done();
      }
    });

    it('OK, array multiple elements, one intersection', (done) => {
      const obj = { elem1: 'value1', field2: 'value2', field3: 'value3' };
      const arr = ['elem1', 'elem2', 'elem3'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('OK, array multiple elements, multiple intersection', (done) => {
      const obj = { elem1: 'value1', elem2: 'value2', field3: 'value3' };
      const arr = ['elem1', 'elem2', 'elem3'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('OK, array multiple elements, all intersection', (done) => {
      const obj = { elem1: 'value1', elem2: 'value2', elem3: 'value3' };
      const arr = ['elem1', 'elem2', 'elem3'];
      try {
        validateAtLeastOneFieldPresent(obj, arr);
        done();
      } catch (err) {
        done(err);
      }
    });
  });
});

/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/CompoundFieldTest.js
 */

import { expect } from 'chai';
import React from 'react';
import TestUtils from 'react-addons-test-utils';
import CompoundFields
  from '../../../view/admin/components/common/CompoundFields';

/* eslint max-statements: ["error", 20, { "ignoreTopLevelFunctions": true }]*/
describe('tests/view/components/CompoundFieldTest.js, CompoundFields Test >',
() => {
  const COOL_VALUE = 'COOL_VALUE';
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;

  /**
   * Dummy function
   */
  function DUMMY() {}
  const FIELD_NAME = 'field_set_1';
  const KEY_ONE = '0.33333';
  const KEY_TWO = '0.77777';
  const sharedProps = {
    name: FIELD_NAME,
    onChange: DUMMY,
    onRemove: DUMMY,
    onAddRow: DUMMY,
  };

  /**
   * Checks basic properties of the given rendered DOM output
   * @param {DOMElement} renderedOutput Check these
   */
  function topLevelCheck(renderedOutput) {
    const { className, children } = renderedOutput.props;
    expect(className).to.equal('form-element__group');
    expect(children.length).to.equal(TWO); // one container + one button
    expect(children[ONE].props.type).to.equal('button');
  }

  /**
   * Set up the DOM element.
   * @param {Array} linkObjects Contains the values and keys
   * @param {Array} fields The fields per row
   * @param {String} arrayType Either string or object
   * @returns {DOMElement}The rendered compound fields
   */
  function getOutput(linkObjects, fields, arrayType) {
    const props = Object.assign(
      sharedProps, {
        linkObjects,
        fields,
        arrayType,
      },
    );
    const renderer = TestUtils.createRenderer();
    renderer.render(
      <CompoundFields { ...props } />
    );
    return renderer.getRenderOutput();
  }

  it('with empty array inputs, renders one "None" row and' +
    ' one "Add New" button', () => {
    const FIELDS = [];
    const LINKOBJECTS = [];
    const CompoundField = getOutput(LINKOBJECTS, FIELDS, 'string');
    topLevelCheck(CompoundField);
    // one p, one button
    expect(CompoundField.props.children.length).to.equal(TWO);

    const paragraph = CompoundField.props.children[ZERO];
    expect(paragraph.type).to.equal('p');
    expect(paragraph.props.children).to.equal('None');


    const button = CompoundField.props.children[ONE];
    expect(button.type).to.equal('button');
    expect(button.props.className).to.contain('slds-button');
    expect(button.props.onClick).to.equal(DUMMY);
  });

  it('compound fields renders two rows, on an non-empty string array', () => {
    const FIELDS = [];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE + KEY_ONE,
      'key': KEY_ONE,
    }, {
      'value': COOL_VALUE + KEY_TWO,
      'key': KEY_TWO,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'string');
    topLevelCheck(CompoundField);
    // two rows, one add more button
    expect(CompoundField.props.children.length).to.equal(TWO);

    const ROW_1 = CompoundField.props.children[ZERO][ZERO];
    const ROW_2 = CompoundField.props.children[ZERO][ONE];
    expect(ROW_1.props.className).to.equal('slds-form-element__row');
    expect(ROW_2.props.className).to.equal('slds-form-element__row');

    // // each row should contain fields
    expect(ROW_1.props.children.length).to.equal(TWO); // 1 field, 1 button
    expect(ROW_2.props.children.length).to.equal(TWO); // 1 field, 1 button
  });

  it('object array renders label and input with expected values', () => {
    const NAME = 'TOOT';
    const FIELDS = [NAME];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE,
      'key': KEY_ONE,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'object');
    topLevelCheck(CompoundField);
    const row = CompoundField.props.children[ZERO][ZERO];
    const holder= row.props.children[ZERO][ZERO];
    // one label, one input
    expect(holder.props.children.length).to.equal(TWO);
    const label = holder.props.children[ZERO];
    expect(label.type).to.equal('label');
    expect(label.props.children).to.equal(NAME);

    const input = holder.props.children[ONE];
    expect(input.props.name).to.equal(NAME);
    expect(input.props.value).to.equal(COOL_VALUE);
  });

  it('one field with no label rendered with expected value and name', () => {
    const FIELDS = [];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE,
      'key': KEY_ONE,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'string');
    topLevelCheck(CompoundField);
    const row = CompoundField.props.children[ZERO][ZERO];
    const holder= row.props.children[ZERO];
    expect(holder.props.className).to.contain('slds-form-element');

    // children[ZERO] is undefined, as this field has no label
    const input = holder.props.children[ONE];
    expect(input.props.name).to.equal(FIELD_NAME);
    expect(input.props.value).to.equal(COOL_VALUE);
  });

  it('row with field rendered with delete button', () => {
    const FIELDS = [];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE,
      'key': KEY_ONE,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'string');
    topLevelCheck(CompoundField);
    const row = CompoundField.props.children[ZERO][ZERO];
    expect(row.props.children.length).to.equal(TWO); // one field, one button
    const buttonContainer = row.props.children[ONE];
    expect(buttonContainer.props.children.type).to.equal('button');
  });

  it('row rendered with expected combined key', () => {
    const FIELDS = ['field_2', 'field_1'];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE + KEY_ONE,
      'key': KEY_ONE,
    }, {
      'value': COOL_VALUE + KEY_TWO,
      'key': KEY_TWO,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'object');
    topLevelCheck(CompoundField);
    const row = CompoundField.props.children[ZERO][ZERO];
    expect(row.props.className).to.equal('slds-form-element__row');
    expect(row.key).to.equal(KEY_TWO + KEY_ONE);
  });

  it('row rendered with expected single key', () => {
    const FIELDS = [];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE,
      'key': KEY_ONE,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'string');
    topLevelCheck(CompoundField);
    const row = CompoundField.props.children[ZERO][ZERO];
    expect(row.key).to.equal(KEY_ONE);
  });

  it('renders one row with two fields with non-empty objects array', () => {
    const FIELDS = ['field_1', 'field_2'];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE + KEY_ONE,
      'key': KEY_ONE,
    }, {
      'value': COOL_VALUE + KEY_TWO,
      'key': KEY_TWO,
    }];

    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'object');
    topLevelCheck(CompoundField);
    // one row, one button
    expect(CompoundField.props.children.length).to.equal(TWO);

    const row = CompoundField.props.children[ZERO];
    expect(row[ZERO].props.className).to.equal('slds-form-element__row');
    expect(row[ZERO].props.children.length).to.equal(TWO); // two fields
  });

  it('renders a single paragraph if object array and empty field', () => {
    const FIELDS = [];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE,
      'key': KEY_ONE,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'object');
    topLevelCheck(CompoundField);

    const paragraph = CompoundField.props.children[ZERO];
    expect(paragraph.type).to.equal('p');
    expect(paragraph.props.children).to.equal('None');
  });

  it('renders single field with object array and one field', () => {
    const FIELDS = [COOL_VALUE];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE,
      'key': KEY_ONE,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'object');
    topLevelCheck(CompoundField);

    const row = CompoundField.props.children[ZERO];
    expect(row[ZERO].props.className).to.equal('slds-form-element__row');
    expect(row[ZERO].props
      .children.length).to.be.above(ZERO); // row should contain a field
    expect(row.length).to.equal(ONE); // one field in row
    expect(row[ZERO].key).to.equal(KEY_ONE);
  });

  it('renders single field with string array', () => {
    const FIELDS = [];
    const LINKOBJECTS_NON_EMPTY = [{
      'value': COOL_VALUE,
      'key': KEY_ONE,
    }];
    const CompoundField = getOutput(LINKOBJECTS_NON_EMPTY, FIELDS, 'string');
    topLevelCheck(CompoundField);

    const row = CompoundField.props.children[ZERO];
    expect(row[ZERO].props.className).to.equal('slds-form-element__row');
    expect(row[ZERO].props
      .children.length).to.be.above(ZERO); // row should contain a field
    expect(row.length).to.equal(ONE); // one field in row
    expect(row[ZERO].key).to.equal(KEY_ONE);
  });
});

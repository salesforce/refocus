/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/dropdown.js
 */
import { expect } from 'chai';
import React from 'react';
import { mount } from 'enzyme';
import Dropdown from '../../../view/admin/components/common/Dropdown.js';

describe('tests/view/components/dropdown.js, Dropdown component tests >',
() => {
  const ZERO = 0;
  const ONE = 1;
  const DUMMY_STRING = 'UNITED';
  const DUMMY_ARRAY = DUMMY_STRING.split('');
  const DUMMY_FUNCTION = () => {};

  /**
   * Sets up the component with dummy prop values.
   * @param {Object} propAddons Optional object specifying
   * overrides to the default props
   * @param {ReactElem} childElems The react elements
   * @returns {Object} The rendered component
   */
  function setup(propAddons, childElems) {
    const defaultProps = {
      options: [],
      dropDownStyle: {},
      newButtonText: DUMMY_STRING,
      title: DUMMY_STRING, // which dropdown
      allOptionsLabel: DUMMY_STRING,
      placeholderText: DUMMY_STRING,
      defaultValue: DUMMY_STRING,
      onAddNewButton: DUMMY_FUNCTION,
      onClickItem: DUMMY_FUNCTION,
      showInputElem: false, //default
      // close, open are by default false
    };
    // update props as needed
    if (propAddons) {
      Object.assign(defaultProps, propAddons);
    }
    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(
      <Dropdown {...defaultProps}>{childElems}</Dropdown>
    );
    return enzymeWrapper;
  }

  it('state data loads from props options', () => {
    const ARR = [DUMMY_STRING];
    const enzymeWrapper = setup({ options: ARR });
    const instance = enzymeWrapper.instance();
    expect(instance.state.data.length).to.equal(ONE);
    expect(instance.state.data).to.deep.equal(ARR);
  });

  it('given an array of single element, render single item', () => {
    const enzymeWrapper = setup({ options: [DUMMY_STRING] });
    const instance = enzymeWrapper.instance();
    // change to open state, to show dropdown
    instance.setState({ open: true });
    expect(enzymeWrapper.find('.slds-dropdown__item')).to.have.length(ONE);
  });

  it('on props showEditIcon true, render pencil icon');
  it('by default showEditIcon is false');
  it('on showEditIcon is false, no pencil icon is rendered');

  it('on toggle true, dropdown opens', () => {
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();
    // by default dropdown is closed
    expect(instance.state.open).to.equal(false);
    instance.toggle(true);
    expect(instance.state.open).to.equal(true);
  });

  it('on toggle false, dropdown closes', () => {
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();
    // set up
    instance.setState({ open: true });
    expect(instance.state.open).to.equal(true);

    instance.toggle(false);
    expect(instance.state.open).to.equal(false);
  });

  it('there are NO otions, ' +
    'highlighted index is -1', () => {
      // default: no options
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();
    expect(instance.state.highlightedIndex).to.equal(-ONE);
  });

  it('the INPUT has no value, and there are options, ' +
    'the first cell is NOT highlighted', () => {
    const enzymeWrapper = setup({ options: DUMMY_ARRAY, defaultValue: '' });
    const instance = enzymeWrapper.instance();
    expect(instance.state.highlightedIndex).to.equal(-1);
  });

  it('the INPUT has value, the highlighted index ' +
    'has value === INPUT.value', () => {
    const INPUT_VAL = 'D';
    const enzymeWrapper = setup({
      options: DUMMY_ARRAY,
      defaultValue: INPUT_VAL
    });
    const instance = enzymeWrapper.instance();
    expect(instance.state.highlightedIndex)
      .to.equal(DUMMY_ARRAY.indexOf(INPUT_VAL));
  });

  it('up key wraps around the highlighted index. 0 -> options.length-1', () => {
    const ARR_LEN = DUMMY_ARRAY.length;
    const newIndex = Dropdown.getupdatedIndex(ZERO, ARR_LEN, true);
    expect(newIndex).to.equal(ARR_LEN-ONE);
  });

  it('down key increments the highlighted index, when index === 0', () => {
    const newIndex = Dropdown.getupdatedIndex(ZERO, DUMMY_ARRAY.length, false);
    expect(newIndex).to.equal(ONE);
  });

  it('on enter, url changes to end with the value of' +
    ' the highlighted cell');

  it('calling close from props closes the dropdown', () => {
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();
    instance.handleFocus(); // show the dropdown
    expect(instance.state.open).to.equal(true);
    enzymeWrapper.setProps({ close: true });
    expect(instance.state.open).to.equal(false);
  });

  it('when showInputElem is false and there are ' +
    'child element(s), there is no input rendered', () => {
    // by default, showInputElem = false
    const enzymeWrapper = setup({}, <div id='lookForMe'/>);
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ZERO);
  });

  it('even when showInputElem is false, if given no child elements, ' +
    'input is rendered', () => {
    // by default, showInputElem = false
    const enzymeWrapper = setup();
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ONE);
  });

  it('when showInputElem is true, an input is rendered with ' +
    'child element(s)', () => {
    // by default, showInputElem = false
    const enzymeWrapper = setup(
      { showInputElem: true },
      <div id='lookForMe'/>);
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ONE);
    expect(enzymeWrapper.find('#lookForMe')).to.have.length(ONE);
  });

  it('input is rendered by default', () => {
    const enzymeWrapper = setup();
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ONE);
  });
});

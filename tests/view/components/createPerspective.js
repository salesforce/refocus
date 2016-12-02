/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/createPerspective.js
 */

import { expect } from 'chai';
import React from 'react';
import CreatePerspective from '../../../view/perspective/CreatePerspective.js';
import { mount } from 'enzyme';

describe('List view ', () => {
  const ONE = '1';
  const DUMMY_STRING = 'COOL';
  const DUMMY_FUNCTION = () => {};
  const ZERO = 0;

  /**
   * Sets up the component with dummy prop values.
   * @param {Object} valuesAddons Optional object specifying
   * overrides to the default props
   * @param {Object} stateAddons Optional object specifying
   * overrides to the default props
   * @returns {Object} The rendered component
   */
  function setup(valuesAddons, stateAddons) {
    const defaultProps = {
      cancelCreate: DUMMY_FUNCTION,
      sendResource: DUMMY_FUNCTION,
      values: {
        aspectFilter: [],
        aspectTags: [],
        lenses: [],
        name: DUMMY_STRING,
        perspectives: [],
        statusFilter: [],
        subjectTagFilter: [],
        subjects: [],
      },
      stateObject: {
        perspectives: [],
        subjects: [],
        lenses: [],
        statusFilterType: '',
        statusFilter: '',
        subjectTagFilter: '',
        subjectTagFilterType: '',
        aspectTagFilter: '',
        aspectTagFilterType: '',
        aspectFilter: '',
        aspectFilterType: '',
      }
    };
    // update props as needed
    let props = defaultProps;
    if (valuesAddons) {
      props.values = Object.assign(defaultProps.values, valuesAddons);
    }
    if (stateAddons) {
      props.stateObject = Object.assign(defaultProps.stateAddons, stateAddons);
    }
    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(<CreatePerspective {...props} />);

    return enzymeWrapper;
  }

  it('given the proper url parameter and resource, ' +
    ' create modal is shown with proper resource name', () => {
    const enzymeWrapper = setup();
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(ONE);
    expect(enzymeWrapper.find('.slds-text-heading--medium').text())
      .to.equal('New Perspective');
  });

  /**
   * Returns an array of resources with identical
   * isPublished property, with
   * fieldName field == index in loop
   *
   * @param {Integer} INT Make this many resources
   * @param {String} fieldName The field of each resource
   * @param {Boolean} isPublished All resources have
   * this value of isPublished
   * @returns {Array} Array with all published resources
   */
  function getSubjects(INT, fieldName, isPublished) {
    let subjects = [];
    for (let i = INT; i > ZERO; i--) {
      const obj = {
        isPublished,
        absolutePath: i,
      };
      obj[fieldName] = i;
      subjects.push(obj);
    }
    return subjects;
  }

  it('updateDropdownConfig updates subjects as intended', () => {
    const NUM = 100;
    const subjects = getSubjects(NUM, 'absolutePath', true);
    const enzymeWrapper = setup({
      subjects,
    });
    const instance = enzymeWrapper.instance();
    instance.updateDropdownConfig();
    const config = instance.state.dropdownConfig;
    expect(Object.keys(config)).to.contain('subjects');
    expect(config.subjects.options.length).to.equal(NUM);
  });

  it('getArray returns only published resources', () => {
    const getArray = CreatePerspective.getArray;
    const NUM = 10;
    const unPublished = getArray(
      'absolutePath',
      getSubjects(NUM, 'absolutePath')
    );
    expect(unPublished.length).to.be.empty;

    const published = getArray(
      'absolutePath',
      getSubjects(NUM, 'absolutePath', true)
    );
    expect(published.length).to.equal(NUM);
    // input is in decreasing order
    // should preserve order
    expect(published[ZERO]).to.equal(NUM);
  });

  it('getArray does not change order of input resources', () => {
    const getArray = CreatePerspective.getArray;
    const NUM = 10;

    const published = getArray(
      'absolutePath',
      getSubjects(NUM, 'absolutePath', true)
    );
    // input is in decreasing order
    // should preserve order
    expect(published[ZERO]).to.equal(NUM);
  });
});

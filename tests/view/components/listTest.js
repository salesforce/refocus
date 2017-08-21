/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/listViewTest.js
 */

import { expect } from 'chai';
import React from 'react';
import sinon from 'sinon';
import List from '../../../view/admin/components/pages/List.js';
import { mount } from 'enzyme';

describe('tests/view/components/listViewTest.js, List view >', () => {
  const ONE = '1';
  const DUMMY_STRING = 'COOL';
  const DUMMY_FUNCTION = () => {};
  const DUMMY_OBJ = { dummy: DUMMY_STRING };
  const SUBJECT_URL = '/subjects';

  /**
   * Sets up the component with dummy prop values.
   * @param {Object} fieldObj Optional object specifying
   * overrides to the default props
   * @returns {Object} The rendered component
   */
  function setup(fieldObj) {
    const defaultProps = {
      url: SUBJECT_URL,
      history: { push: DUMMY_FUNCTION },
      urlQuery: '', // alternatively '?edit'
      deleteResource: DUMMY_FUNCTION,
      postResource: DUMMY_FUNCTION,
      fetchResources: DUMMY_FUNCTION,
      // key can be subjects, samples, or aspects
      refocusReducer: { subjects: DUMMY_OBJ },
      getFormData: DUMMY_FUNCTION,
      params: DUMMY_OBJ,
    };
    // update props as needed
    const props = fieldObj ?
      Object.assign(defaultProps, fieldObj) : defaultProps;
    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(<List {...props} />);

    return enzymeWrapper;
  }

  it('given the proper url parameter and resource, ' +
    ' create modal is shown with proper resource name', () => {
    const enzymeWrapper = setup({
      params: {
        identifier: 'new',
      },
    });
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(ONE);
    expect(enzymeWrapper.find('.slds-text-heading--medium').text())
      .to.equal('Create new subject');
  });

  it('on create with failed validation,' +
    ' error state is updated with expected input', () => {
    const enzymeWrapper = setup({
      checkValidation: () => {
        return { 'tags': ['in valid'] };
      },
    });
    const instance = enzymeWrapper.instance();
    // don't need inputs as inputs are used only by checkValidation
    instance.processData();
    expect(instance.state.error).to.contain('tags');
  });

  it('on create with failed validation, postResource is not called', () => {
    const spy = sinon.spy();
    // open create modal
    const enzymeWrapper = setup({
      checkValidation: () => {
        return { 'tags': ['in valid'] };
      },
      postResource: spy,
    });
    const instance = enzymeWrapper.instance();
    // don't need inputs as inputs are used only by checkValidation
    instance.processData();
    expect(spy.calledOnce).to.be.false;
  });

  it('on create, with string error state,' +
    ' the modal shows the expected error message', () => {
    const enzymeWrapper = setup({
      params: {
        identifier: 'new',
      },
    });
    const ERROR_STRING = 'tags are invalid';
    const instance = enzymeWrapper.instance();
    instance.showError(ERROR_STRING);
    expect(enzymeWrapper.find('.error-text').text()).to.equal(ERROR_STRING);
  });
});

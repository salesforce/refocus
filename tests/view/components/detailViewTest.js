/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/detailViewTest.js
 */

import { expect } from 'chai';
import React from 'react';
import sinon from 'sinon';
import Detail from '../../../view/admin/components/pages/Detail.js';
import { mount } from 'enzyme';

describe.only('Detail view ', () => {
  const DUMMY_STRING = 'COOL';
  const DUMMY_FUNCTION = ()=> {};
  const DUMMY_OBJ = { dummy: DUMMY_STRING };
  const SUBJECT_URL = '/subjects/I/have/a/long/absolute/path';

  /**
   * Sets up the component with props.
   * @param {Object} fieldObj Optional object specifying
   * overrides to the default props
   * @returns {Object} The rendered component
   */
  function setup(fieldObj) {
    const defaultProps = {
      isEditing: false,
      url:  SUBJECT_URL,
      deleteResource: DUMMY_FUNCTION,
      putResource: DUMMY_FUNCTION,
      fetchResources: DUMMY_FUNCTION,
      refocusReducer:  { subject: DUMMY_OBJ },
      history: [],
      getFormData: DUMMY_FUNCTION,
      changeAspectRangeFormat: DUMMY_FUNCTION,
    };
    // update props as needed
    const props = fieldObj ?
      Object.assign(defaultProps, fieldObj) : defaultProps;
    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(<Detail {...props} />);

    return {
      props,
      enzymeWrapper
    };
  }

  it('should render button row with three buttons');

  it('on click delete button, handleDeleteClick is called');

  it('toggling isEditing change the url to expected value');

  it('on setting state askDelete to true, delete modal is' +
    ' rendered with expected title and Delete button', () => {
    const { enzymeWrapper } = setup();
    // no modal at the beginning
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(0);
    enzymeWrapper.setState({ askDelete: true });
    // delete modal should be rendered
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(1);
    expect(enzymeWrapper.find('h2').text()).to.equal('Delete subject');
    expect(enzymeWrapper.find('.slds-button--brand').text()).to.equal('Delete');
  });

  it('on setting prop isEditing to true, edit modal is' +
    ' rendered with expected title and Save button', () => {
    const { enzymeWrapper } = setup({ isEditing: true });
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(1);
    expect(enzymeWrapper.find('h2').text()).to.equal('Edit subject');
    expect(enzymeWrapper.find('.slds-button--brand').text()).to.equal('Save');
  });

  it('on cancel delete, askDelete reverts to false', () => {
    // calling the delete handler should set the
    // delete status to true
    const { enzymeWrapper } = setup();
    const instance = enzymeWrapper.instance();
    instance.handleDeleteClick();
    expect(instance.state.askDelete).to.equal(true);

    // turn the delete state false
    instance.turnOffDelete();
    expect(instance.state.askDelete).to.equal(false);
  });
});

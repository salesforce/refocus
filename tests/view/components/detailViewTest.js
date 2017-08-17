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

describe('tests/view/components/detailViewTest.js, Detail view >', () => {
  const ONE = '1';
  const DUMMY_STRING = 'COOL';
  const DUMMY_FUNCTION = () => {};
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
      url: SUBJECT_URL,
      deleteResource: DUMMY_FUNCTION,
      putResource: DUMMY_FUNCTION,
      fetchResources: DUMMY_FUNCTION,
      refocusReducer: { subject: DUMMY_OBJ },
      history: { push: DUMMY_FUNCTION },
      getFormData: DUMMY_FUNCTION,
      changeAspectRangeFormat: DUMMY_FUNCTION,
    };
    // update props as needed
    const props = fieldObj ?
      Object.assign(defaultProps, fieldObj) : defaultProps;
    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(<Detail {...props} />);

    return enzymeWrapper;
  }

  it('state overwrites form Object when the latter has empty array', () => {
    const formObj = { name: DUMMY_STRING, tags: [] };
    const invalidFieldObj = { tags: [' I am invalid'] };
    const updatedObj = Object.assign(formObj, invalidFieldObj);
    expect(updatedObj.tags).to.deep.equal(invalidFieldObj.tags);
  });

  it('state overwrites form Object when the latter has empty string', () => {
    const formObj = { name: DUMMY_STRING, helpEmail: '' };
    const invalidFieldObj = { helpEmail: DUMMY_STRING };
    const updatedObj = Object.assign(formObj, invalidFieldObj);
    expect(updatedObj.helpEmail).to.deep.equal(invalidFieldObj.helpEmail);
  });

  it('state overwrites form Object when the latter is non-empty string', () => {
    const formObj = { name: DUMMY_STRING, helpEmail: 'valid@email.com' };
    const invalidFieldObj = { helpEmail: DUMMY_STRING };
    const updatedObj = Object.assign(formObj, invalidFieldObj);
    expect(updatedObj.helpEmail).to.deep.equal(invalidFieldObj.helpEmail);
  });

  it('state overwrites form Object when the latter has values', () => {
    const formObj = { name: DUMMY_STRING, tags: ['valid_tag'] };
    const invalidFieldObj = { tags: [' I am invalid'] };
    const updatedObj = Object.assign(formObj, invalidFieldObj);
    expect(updatedObj.tags).to.deep.equal(invalidFieldObj.tags);
  });

  it('should render button row with three buttons as expected', () => {
    const enzymeWrapper = setup();
    // button row container
    expect(enzymeWrapper.find('.readButtonRow')).to.have.length(ONE);

    const editButton = enzymeWrapper.find('.editButton');
    expect(editButton).to.have.length(ONE);
    expect(editButton.text()).to.equal('Edit');

    const deleteButton = enzymeWrapper.find('.deleteButton');
    expect(deleteButton).to.have.length(ONE);
    expect(deleteButton.text()).to.equal('Delete');

    const addChildLink = enzymeWrapper.find('.addChildLink');
    expect(addChildLink).to.have.length(ONE);
    expect(addChildLink.text()).to.equal('Add Child');
  });

  it('on cancel delete, askDelete reverts to false', () => {
    // calling the delete handler should set the
    // delete status to true
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();
    instance.handleDeleteClick();
    expect(instance.state.askDelete).to.equal(true);

    // turn the delete state false
    instance.turnOffDelete();
    expect(instance.state.askDelete).to.equal(false);
  });

  it('on click delete button, state askDelete changes to true', () => {
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();
    expect(instance.state.askDelete).to.equal(false);
    enzymeWrapper.find('.deleteButton').last().simulate('click');
    expect(instance.state.askDelete).to.equal(true);
  });

  it('on click cancel button, state askDelete changes to false', () => {
    const enzymeWrapper = setup();
    // set state askDelete to true, to show the cancel button
    enzymeWrapper.setState({ askDelete: true });
    const instance = enzymeWrapper.instance();
    expect(instance.state.askDelete).to.equal(true);

    enzymeWrapper.find('.cancelButton').simulate('click');
    expect(instance.state.askDelete).to.equal(false);
  });

  it('toggleEdit on read only page pushes url + ?edit to history', () => {
    const spy = { push: sinon.spy() };
    const enzymeWrapper = setup({ history: spy });
    const instance = enzymeWrapper.instance();
    instance.toggleEdit();
    expect(spy.push.calledOnce).to.be.true;
    expect(spy.push.calledWith(SUBJECT_URL + '?edit')).to.be.true;
  });

  it('toggleEdit on edit page pushes url + ?edit to history', () => {
    const spy = { push: sinon.spy() };
    const enzymeWrapper = setup({
      history: spy,
      isEditing: true,
    });
    const instance = enzymeWrapper.instance();
    instance.toggleEdit();
    expect(spy.push.calledOnce).to.be.true;
    expect(spy.push.calledWith(SUBJECT_URL)).to.be.true;
  });

  it('on click edit, component pushes url + ?edit to history', () => {
    const spy = { push: sinon.spy() };
    const enzymeWrapper = setup({ history: spy });
    enzymeWrapper.find('.editButton').simulate('click');
    expect(spy.push.calledOnce).to.be.true;
    expect(spy.push.calledWith(SUBJECT_URL+ '?edit')).to.be.true;
  });

  it('on click cancel, component pushes url to history', () => {
    const spy = { push: sinon.spy() };
    // set props to is editing, so cancel button renders
    const enzymeWrapper = setup({
      history: spy,
      isEditing: true,
    });
    enzymeWrapper.find('.cancelButton').simulate('click');
    expect(spy.push.calledOnce).to.be.true;
    expect(spy.push.calledWith(SUBJECT_URL)).to.be.true;
  });

  it('on setting state askDelete to true, delete modal is' +
    ' rendered with expected title and Delete button', () => {
    const enzymeWrapper = setup();
    // no modal at the beginning
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(0);
    enzymeWrapper.setState({ askDelete: true });
    // delete modal should be rendered
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(ONE);
    expect(enzymeWrapper.find('h2').text()).to.equal('Delete subject');
    expect(enzymeWrapper.find('.slds-button--brand').text()).to.equal('Delete');
  });

  it('on setting prop isEditing to true, edit modal is' +
    ' rendered with expected title and Save button', () => {
    const enzymeWrapper = setup({ isEditing: true });
    expect(enzymeWrapper.find('.slds-modal__container')).to.have.length(ONE);
    expect(enzymeWrapper.find('h2').text()).to.equal('Edit subject');
    expect(enzymeWrapper.find('.slds-button--brand').text()).to.equal('Save');
  });
});

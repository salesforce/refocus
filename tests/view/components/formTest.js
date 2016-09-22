/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/formTest.js
 */
'use strict';

import React from 'react';
import TestUtils from 'react-addons-test-utils';
import { expect } from 'chai';
import Form from '../../../view/admin/components/common/Forms.js';

describe('Forms', () => {

  var FIELD_NAME = 'hello_world';

  // TODO: troubleshoot why Invariant Violation: Objects are not valid as a React child
  it.skip('calling Form with customOutput, renders the expected output', () => {
    var metaData = [{
      propertyName: 'parentAbsolutePath',
      displayName: 'Parent Absolute Path',
      customOutput: function(data) {
        return <div className='parentAbsolutePath'>{data}</div>;
      },
    },
    ];
    var data = {
      parentAbsolutePath: 'sccdsd',
    };

    var form = TestUtils.renderIntoDocument(
      <Form propertyMetaData={metaData} data={data}/>
    );
    var field = TestUtils
      .findRenderedDOMComponentWithClass(form, 'parentAbsolutePath');
    expect(field.textContent).to.equal(data.parentAbsolutePath);
  });

  it('calling Form with no propertyMetadata, returns empty form');

  it('on read, parentAbsolutePath should be populated, from data', () => {
    var metaData = [{
      propertyName: 'parentAbsolutePath',
      displayName: 'Parent Absolute Path',
    },
    ];
    var data = {
      parentAbsolutePath: 'sccdsd',
    };
    var form = TestUtils.renderIntoDocument(
      <Form propertyMetaData={metaData} data={data}/>
    );
    var field = TestUtils.findRenderedDOMComponentWithTag(form, 'p');
    expect(field.textContent).to.equal(data.parentAbsolutePath);
  });

  it('getFormData returns updated value, after input value change');

  it('getFormData returns expected JSON representation given ' +
    'form with radio buttons');

  it('getFormData returns expected JSON representation given ' +
    'form with inputs whose names include _');

  it('getFormData returns expected JSON representation given ' +
    'form with percent values in input text');

  it('form field renders with default value, as provided', () => {
    var propertyMetaData = [
      {
        propertyName: 'name',
        displayName: 'Name',
      },
    ];
    var data = {
      name: FIELD_NAME,
    };
    var form = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} edit={true} data={data}/>
    );
    var inputTag = TestUtils.findRenderedDOMComponentWithTag(form, 'input');
    expect(inputTag.value).to.equal(FIELD_NAME);
  });

  it('Show in edit mode, readonly fields can be intermingled with editable fields.');

  it('When editable, form fields are mutable: Start with default value. modify value. get value should differ from default value.');

  it('Editable fields, after a readOnly field, is editable.',
    () => {

      var propertyMetaData = [
        {
          propertyName: 'name',
          displayName: 'Name',
        }, {
          propertyName: 'createdById',
          displayName: 'Created By',
          readOnly: true,
        },
      ];
      var data = {
        name: 'hello world',
        createdById: '14356iyu',
      };
      var form = TestUtils.renderIntoDocument(
        <Form propertyMetaData={propertyMetaData} edit={true} data={data}/>
      );
      var labelTags = TestUtils.scryRenderedDOMComponentsWithTag(form, 'label');
      var pTag = TestUtils.findRenderedDOMComponentWithTag(form, 'p');
      var inputTag = TestUtils.findRenderedDOMComponentWithTag(form, 'input');
      expect(labelTags.length).to.equal(2);
      expect(inputTag).to.not.be.null;
      expect(pTag).to.not.be.null;
    });

  it('Form is editable when edit is true', () => {
    var propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    var formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} edit={true}/>
    );
    var labelTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'label');
    var inputTags = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'input');
    var pTags = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'p');
    expect(formWithOneField.props.edit).to.equal(true);
    expect(inputTags.length).to.equal(1);
    expect(pTags.length).to.equal(0);
  });

  it('Non-existent data, renders into N/A when form is non-editable', () => {
    var propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    var formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData}/>
    );
    var inputTag;
    var labelTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'label');
    var pTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'p');
    expect(labelTag.textContent).to.equal('Name');
    expect(pTag.textContent).to.equal('N/A');
  });

  it('By default, form is non-editable. One field returns a label, with paragraph', () => {
    var propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    var data = {
      name: 'hello world',
    };
    var formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} data={data}/>
    );
    var labelTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'label');
    var pTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'p');
    expect(labelTag.textContent).to.equal('Name');
    expect(pTag.textContent).to.equal('hello world');
  });

  it('Empty metadata passed in, results in empty form', () => {
    var propertyMetaData = [];
    var emptyForm = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData}/>
    );
    var pTags = TestUtils.scryRenderedDOMComponentsWithTag(emptyForm, 'p');
    expect(pTags).to.be.empty;
  });

  it('Input fields should match propertyMetadata objects', () => {
    //Limiting fields by propertyMetaData works
    var propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    var data = {
      name: 'hello world',
      code: 'hello world',
      achoo: 'hello world',
    };
    var formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} data={data}/>
    );
    var labelTag = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'label');
    var pTag = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'p');
    expect(labelTag.length).to.equal(pTag.length);
    expect(propertyMetaData.length).to.equal(pTag.length);
  });
});

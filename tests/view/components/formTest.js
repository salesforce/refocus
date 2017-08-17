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

describe('tests/view/components/formTest.js, Forms >', () => {
  const FIELD_NAME = 'hello_world';

  // TODO: troubleshoot why Inconstiant Violation: Objects are not valid as a React child
  it.skip('calling Form with customOutput, renders the expected output', () => {
    const metaData = [{
      propertyName: 'parentAbsolutePath',
      displayName: 'Parent Absolute Path',
      customOutput: function(data) {
        return <div className='parentAbsolutePath'>{data}</div>;
      },
    },
    ];
    const data = {
      parentAbsolutePath: 'sccdsd',
    };

    const form = TestUtils.renderIntoDocument(
      <Form propertyMetaData={metaData} data={data}/>
    );
    const field = TestUtils
      .findRenderedDOMComponentWithClass(form, 'parentAbsolutePath');
    expect(field.textContent).to.equal(data.parentAbsolutePath);
  });

  it('calling Form with no propertyMetadata, returns empty form');

  it('on read, parentAbsolutePath should be populated, from data', () => {
    const metaData = [{
      propertyName: 'parentAbsolutePath',
      displayName: 'Parent Absolute Path',
    },
    ];
    const data = {
      parentAbsolutePath: 'sccdsd',
    };
    const form = TestUtils.renderIntoDocument(
      <Form propertyMetaData={metaData} data={data}/>
    );
    const field = TestUtils.findRenderedDOMComponentWithTag(form, 'p');
    expect(field.textContent).to.equal(data.parentAbsolutePath);
  });

  it('form field renders with default value, as provided', () => {
    const propertyMetaData = [
      {
        propertyName: 'name',
        displayName: 'Name',
      },
    ];
    const data = {
      name: FIELD_NAME,
    };
    const form = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} edit={true} data={data}/>
    );
    const inputTag = TestUtils.findRenderedDOMComponentWithTag(form, 'input');
    expect(inputTag.value).to.equal(FIELD_NAME);
  });

  it('Show in edit mode, readonly fields can be intermingled with editable fields.');

  it('When editable, form fields are mutable: Start with default value. modify value. get value should differ from default value.');

  it('Editable fields, after a readOnly field, is editable.',
    () => {

      const propertyMetaData = [
        {
          propertyName: 'name',
          displayName: 'Name',
        }, {
          propertyName: 'createdById',
          displayName: 'Created By',
          readOnly: true,
        },
      ];
      const data = {
        name: 'hello world',
        createdById: '14356iyu',
      };
      const form = TestUtils.renderIntoDocument(
        <Form propertyMetaData={propertyMetaData} edit={true} data={data}/>
      );
      const labelTags = TestUtils.scryRenderedDOMComponentsWithTag(form, 'label');
      const pTag = TestUtils.findRenderedDOMComponentWithTag(form, 'p');
      const inputTag = TestUtils.findRenderedDOMComponentWithTag(form, 'input');
      expect(labelTags.length).to.equal(2);
      expect(inputTag).to.not.be.null;
      expect(pTag).to.not.be.null;
    });

  it('Form is editable when edit is true', () => {
    const propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    const formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} edit={true}/>
    );
    const labelTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'label');
    const inputTags = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'input');
    const pTags = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'p');
    expect(formWithOneField.props.edit).to.equal(true);
    expect(inputTags.length).to.equal(1);
    expect(pTags.length).to.equal(0);
  });

  it('Non-existent data, renders into N/A when form is non-editable', () => {
    const propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    const formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData}/>
    );
    const labelTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'label');
    const pTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'p');
    expect(labelTag.textContent).to.equal('Name');
    expect(pTag.textContent).to.equal('N/A');
  });

  it('By default, form is non-editable. One field returns a label, with paragraph', () => {
    const propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    const data = {
      name: 'hello world',
    };
    const formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} data={data}/>
    );
    const labelTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'label');
    const pTag = TestUtils.findRenderedDOMComponentWithTag(formWithOneField, 'p');
    expect(labelTag.textContent).to.equal('Name');
    expect(pTag.textContent).to.equal('hello world');
  });

  it('Empty metadata passed in, results in empty form', () => {
    const propertyMetaData = [];
    const emptyForm = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData}/>
    );
    const pTags = TestUtils.scryRenderedDOMComponentsWithTag(emptyForm, 'p');
    expect(pTags).to.be.empty;
  });

  it('Input fields should match propertyMetadata objects', () => {
    // Limiting fields by propertyMetaData works
    const propertyMetaData = [{
      propertyName: 'name',
      displayName: 'Name',
    },
    ];
    const data = {
      name: 'hello world',
      code: 'hello world',
      achoo: 'hello world',
    };
    const formWithOneField = TestUtils.renderIntoDocument(
      <Form propertyMetaData={propertyMetaData} data={data}/>
    );
    const labelTag = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'label');
    const pTag = TestUtils.scryRenderedDOMComponentsWithTag(formWithOneField, 'p');
    expect(labelTag.length).to.equal(pTag.length);
    expect(propertyMetaData.length).to.equal(pTag.length);
  });
});

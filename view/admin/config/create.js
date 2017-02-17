/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/admin/config/create.js
 *
 * JSON to configure Form element in pages/Create view
 * Usage:
 * import { subject, aspect } form '../config/create'
 */

import React from 'react';
import CheckBoxComponent from '../components/common/CheckBoxComponent';
import CompoundFieldComponent
from '../components/common/CompoundFieldComponent';
import ReactSelectize from 'react-selectize';
const SimpleSelect = ReactSelectize.SimpleSelect;
import RangeSelector from '../components/common/RangeSelector';
import MaxMinComponent from '../components/common/MaxMinComponent';

const obj = {};
obj.samples = [
  {
    propertyName: 'name',
    displayName: 'Name',
  }, {
    propertyName: 'value',
    displayName: 'Value',
  }, {
    propertyName: 'aspectId',
    displayName: 'Aspect Id',
  }, {
    propertyName: 'subjectId',
    displayName: 'Subject Id',
  },
];

obj.subjects = [{
  propertyName: 'name',
  displayName: 'Name',
  validate: /^[0-9A-Za-z_\\-]{1,60}$/,
}, {
  propertyName: 'parentAbsolutePath',
  displayName: 'Parent Absolute Path',
  customValueQuery:
    'document.getElementsByClassName("simple-value")[0].textContent',
  propsFromForm: ['subjects', 'parentAbsolutePath'],
  customOutput: (object) => {
    const { subjects, parentAbsolutePath } = object;

    // the default value is parentAbsolutePath,
    // input value updates to the subject's absolutePath, since that is
    // its child's parentAbsolutePath
    const options = subjects.length ? subjects.map((subject) => {
      return { label: subject.absolutePath, value: subject.absolutePath };
    }) : {};
    return <SimpleSelect
    options={ options }
    defaultValue = {{ label: parentAbsolutePath, value: parentAbsolutePath }}
    placeholder='Choose subject'
    style = {{ width: 550 }} />;
  },
}, {
  propertyName: 'description',
  displayName: 'Description',
}, {
  propertyName: 'sortBy',
  displayName: 'Sort By',
  validate: /^[0-9A-Za-z_\\-]{0,254}$/,
}, {
  propertyName: 'helpUrl',
  displayName: 'Help Url',
}, {
  propertyName: 'helpEmail',
  displayName: 'Help Email',
}, {
  propertyName: 'relatedLinks',
  displayName: 'Related links',
  customOutput: (object) => {
    return <CompoundFieldComponent
      name={ object.name }
      type={ 'object' }
      disabled={ object.disabled }
      values={ object.value }
      fields={ ['url', 'name'] }
    />;
  },
}, {
  propertyName: 'tags',
  displayName: 'Tags',
  validate: /^[0-9A-Za-z_\\-]{1,60}$/,
  customOutput: (object) => {
    return <CompoundFieldComponent
      name={ object.name }
      type={ 'string' }
      disabled={ object.disabled }
      values={ object.value }
      fields={ [] }
    />;
  },
},
];

obj.aspects = [{
  propertyName: 'name',
  displayName: 'Name',
}, {
  propertyName: 'description',
  displayName: 'Description',
}, {
  propertyName: 'helpEmail',
  displayName: 'Help Email',
}, {
  propertyName: 'helpUrl',
  displayName: 'Help Url',
}, {
  propertyName: 'imageUrl',
  displayName: 'Icon',
}, {
  propertyName: 'timeout',
  displayName: 'Timeout',
}, {
  propertyName: 'valueLabel',
  displayName: 'Value Label',
}, {
  propertyName: 'relatedLinks',
  displayName: 'Related links',
  customOutput: (object) => {
    return <CompoundFieldComponent
      name={ object.name }
      type={ 'object' }
      disabled={ object.disabled }
      values={ object.value }
      fields={ ['url', 'name'] }
    />;
  },
}, {
  propertyName: 'tags',
  displayName: 'Tags',
  validate: /^[0-9A-Za-z_\\-]{1,60}$/,
  customOutput: (object) => {
    return <CompoundFieldComponent
      name={ object.name }
      type={ 'string' }
      disabled={ object.disabled }
      values={ object.value }
      fields={ [] }
    />;
  },
}, {
  propertyName: 'valueType',
  displayName: 'Map value to Statuses',
  propsFromForm: ['changeAspectRangeFormat',
  'resetAspectRange', 'aspectRangeFormat',
  ],
  customOutput: (object) => {
    return <RangeSelector {...object} />;
  },
}, {
  propertyName: 'criticalRange',
  displayName: 'Critical',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (object) => {
    return <MaxMinComponent { ...object } />;
  },
}, {
  propertyName: 'warningRange',
  displayName: 'Warning',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (object) => {
    return <MaxMinComponent { ...object } />;
  },
}, {
  propertyName: 'infoRange',
  displayName: 'Info',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (object) => {
    return <MaxMinComponent { ...object } />;
  },
}, {
  propertyName: 'okRange',
  displayName: 'ok',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (object) => {
    return <MaxMinComponent { ...object } />;
  },
}, {
  propertyName: 'isPublished',
  displayName: 'Aspect is published',
  customOutput: (resourceObj) => {
    return <CheckBoxComponent
      name={ resourceObj.name }
      disabled={ false }
    />;
  },
},
];

module.exports = obj;

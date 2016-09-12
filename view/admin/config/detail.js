/**
 * view/admin/config/detail.js
 *
 * JSON to configure Form element in pages/Detail view
 * Usage:
 * import { subject, aspect } form '../config/detail'
 */

import React from 'react';
import CheckBoxComponent from '../components/common/CheckBoxComponent';
import CompoundFieldComponent
from '../components/common/CompoundFieldComponent';
import RangeSelector from '../components/common/RangeSelector';
import MaxMinComponent from '../components/common/MaxMinComponent';

const aspectMetaData = [{
  propertyName: 'name',
  displayName: 'Name',
}, {
  propertyName: 'description',
  displayName: 'Description',
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
  propertyName: 'statusFormula',
  displayName: 'Status Formula',
}, {
  propertyName: 'helpEmail',
  displayName: 'Help Email',
}, {
  propertyName: 'helpUrl',
  displayName: 'Help Url',
}, {
  propertyName: 'relatedLinks',
  displayName: 'Related links',
  customOutput: (object) => {
    return <CompoundFieldComponent
      name={ object.name }
      disabled={ object.disabled }
      value={ object.value }
      fields={ ['url', 'name'] }
    />;
  },
}, {
  propertyName: 'tags',
  displayName: 'Tags',
  customOutput: (object) => {
    return <CompoundFieldComponent
      name={ object.name }
      disabled={ object.disabled }
      value={ object.value }
      fields={ ['name'] }
    />;
  },
}, {
  propertyName: 'valueType',
  displayName: 'Map value to Statuses',
  propsFromForm: ['changeAspectRangeFormat',
  'resetAspectRange', 'aspectRangeFormat',
  ],
  customOutput: (obj) => {
    return <RangeSelector {...obj} />;
  },
}, {
  propertyName: 'criticalRange',
  displayName: 'Critical',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (obj) => {
    return <MaxMinComponent { ...obj } />;
  },
}, {
  propertyName: 'warningRange',
  displayName: 'Warning',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (obj) => {
    return <MaxMinComponent { ...obj } />;
  },
}, {
  propertyName: 'infoRange',
  displayName: 'Info',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (obj) => {
    return <MaxMinComponent { ...obj } />;
  },
}, {
  propertyName: 'okRange',
  displayName: 'ok',
  propsFromForm: ['aspectRangeFormat', 'defaultAspectRange'],
  customOutput: (obj) => {
    return <MaxMinComponent { ...obj } />;
  },
}, {
  propertyName: 'createdById',
  displayName: 'Created By',
  readOnly: true,
}, {
  propertyName: 'createdAt',
  displayName: 'Created On',
  readOnly: true,
}, {
  propertyName: 'updatedAt',
  displayName: 'Last Modified On',
  readOnly: true,
}, {
  propertyName: 'isPublished',
  displayName: 'Aspect is published',
  customOutput: (obj) => {
    return <CheckBoxComponent
      name={ obj.name }
      disabled={ obj.disabled }
      checked={ obj.value }
    />;
  },
},
];

const sampleMetaData = [
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
  }, {
    propertyName: 'status',
    displayName: 'Status',
    readOnly: true,
  }, {
    propertyName: 'previousStatus',
    displayName: 'Previous Status',
    readOnly: true,
  }, {
    propertyName: 'statusChangedAt',
    displayName: 'Status Changed At',
    readOnly: true,
  }, {
    propertyName: 'createdAt',
    displayName: 'Created On',
    readOnly: true,
  }, {
    propertyName: 'updatedAt',
    displayName: 'Last Modified On',
    readOnly: true,
  },
];

const subjectMetaData = [
  {
    propertyName: 'name',
    displayName: 'Name',
  }, {
    propertyName: 'parentAbsolutePath',
    displayName: 'Parent Absolute Path',
  }, {
    propertyName: 'childCount',
    displayName: 'Number of Children',
    readOnly: true,
  }, {
    propertyName: 'absolutePath',
    displayName: 'Absolute Path',
    readOnly: true,
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
    propertyName: 'createdById',
    displayName: 'Created By',
    readOnly: true,
  }, {
    propertyName: 'relatedLinks',
    displayName: 'Related links',
    customOutput: (object) => {
      return <CompoundFieldComponent
        name={ object.name }
        disabled={ object.disabled }
        value={ object.value }
        fields={ ['url', 'name'] }
      />;
    },
  }, {
    propertyName: 'tags',
    displayName: 'Tags',
    customOutput: (object) => {
      return <CompoundFieldComponent
        name={ object.name }
        disabled={ object.disabled }
        value={ object.value }
        fields={ ['name'] }
      />;
    },
  }, {
    propertyName: 'createdAt',
    displayName: 'Created On',
    readOnly: true,
  }, {
    propertyName: 'updatedAt',
    displayName: 'Last Modified On',
    readOnly: true,
  }, {
  propertyName: 'isPublished',
  displayName: 'Subject is published',
  customOutput: (obj) => {
    return <CheckBoxComponent
      name={ obj.name }
      disabled={ obj.disabled }
      checked={ obj.value }
    />;
  },
},
];

const obj = {};
obj.subject = { propertyMetaData: subjectMetaData };
obj.aspect = { propertyMetaData: aspectMetaData };
obj.sample = { propertyMetaData: sampleMetaData };
module.exports = obj;

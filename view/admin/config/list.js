/**
 * view/admin/config/list.js
 *
 * JSON to configure table element in pages/List view
 * Usage:
 * import { subject, aspect } form '../config/list'
 */

const sampleMetaData = [{
  'columnName': 'name',
  'displayName': 'Name',
  customOutput: 'link',
}, {
  'columnName': 'value',
  'displayName': 'value'
}, {
  columnName: 'Actions',
  displayName: 'Actions',
}];

const subjectMetaData = [{
  columnName: 'absolutePath',
  displayName: 'Absolute Path',
  customOutput: 'link',
}, {
  columnName: 'childCount',
  displayName: 'Child Count',
}, {
  columnName: 'Actions',
  displayName: 'Actions',
},
];

const aspectMetaData = [{
  columnName: 'name',
  displayName: 'Name',
  customOutput: 'link',
}, {
  columnName: 'isPublished',
  displayName: 'Is Published',
  customOutput: 'checkbox',
  readOnly: true
}, {
  columnName: 'Actions',
  displayName: 'Actions',
},
];

const obj = {};
obj.subjects = {
  propertyMetaData: subjectMetaData,
};
obj.samples = {
  propertyMetaData: sampleMetaData,
};
obj.aspects = { propertyMetaData: aspectMetaData };
module.exports = obj;


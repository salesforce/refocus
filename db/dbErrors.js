/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/dbErrors.js
 *
 * Database Error Definitions
 */

const dbErrors = require('errors');

dbErrors.create({
  code: 10010,
  name: 'FocusDatabaseError',
});

// ----------------------------------------------------------------------------
// Validation Errors
// ----------------------------------------------------------------------------

dbErrors.create({
  code: 10100,
  status: 400,
  name: 'ValidationError',
  parent: dbErrors.FocusDatabaseError,
  fields: [],
});
dbErrors.create({
  code: 10101,
  status: 400,
  name: 'MissingRequiredFieldError',
  parent: dbErrors.ValidationError,
  fields: [],
});
dbErrors.create({
  code: 10111,
  status: 400,
  name: 'InvalidProfileReassignmentError',
  parent: dbErrors.ValidationError,
  profile: {},
});
dbErrors.create({
  code: 10112,
  status: 400,
  name: 'InvalidRangeValuesError',
  parent: dbErrors.ValidationError,
  range: [],
  defaultMessage: 'The second element in the range must be greater than or ' +
    'equal to the first element',
});
dbErrors.create({
  code: 10113,
  status: 400,
  name: 'InvalidRangeSizeError',
  parent: dbErrors.ValidationError,
  range: [],
  defaultMessage: 'A non-null range must include two elements',
});
dbErrors.create({
  code: 10114,
  status: 400,
  name: 'ParentSubjectNotFound',
  parent: dbErrors.ValidationError,
  defaultMessage: 'Could not find the specified parent for this subject.',
  explanation: 'If a subject specifies that it has a parent, the parent ' +
   'subject must already exist.',
});
dbErrors.create({
  code: 10115,
  status: 400,
  name: 'ParentSubjectNotMatch',
  parent: dbErrors.ValidationError,
  defaultMessage: 'The parentAbsolutePath and parentId do not match.',
  explanation: 'If a subject specifies both a parentAbsolutePath and a ' +
    'parentId, the parent specified by both fields need to have the same id.',
});
dbErrors.create({
  code: 10116,
  status: 400,
  name: 'DuplicateBotError',
  parent: dbErrors.ValidationError,
  defaultMessage: 'You cannot have duplicate bots in a room.',
});
dbErrors.create({
  code: 10117,
  status: 400,
  name: 'IllegalSelfParenting',
  parent: dbErrors.ValidationError,
  defaultMessage: 'A subject may not be its own parent.',
});
dbErrors.create({
  code: 10118,
  status: 400,
  name: 'SampleGeneratorContextEncryptionError',
  parent: dbErrors.ValidationError,
  defaultMessage: 'Unable to save this Sample Generator with encrypted ' +
  'context data. Please contact your Refocus administrator to set ' +
  'up the encryption algorithm and key to protect any sensitive information ' +
  'you may include in your Sample Generator\'s context',
});
dbErrors.create({
  code: 10119,
  status: 400,
  name: 'DuplicateCollectorError',
  parent: dbErrors.ValidationError,
  defaultMessage: 'You cannot map duplicate Collectors to a Generator.',
});

// ----------------------------------------------------------------------------
// Not Found
// ----------------------------------------------------------------------------
dbErrors.create({
  code: 10200,
  status: 404,
  name: 'ResourceNotFoundError',
  parent: dbErrors.FocusDatabaseError,
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
// Delete Constraint Errors
// ----------------------------------------------------------------------------
dbErrors.create({
  code: 10300,
  status: 403,
  name: 'DeleteConstraintError',
  parent: dbErrors.FocusDatabaseError,
});
dbErrors.create({
  code: 10301,
  status: 403,
  name: 'ProfileDeleteConstraintError',
  parent: dbErrors.DeleteConstraintError,
  profile: {},
});
dbErrors.create({
  code: 10302,
  status: 403,
  name: 'SubjectDeleteConstraintError',
  parent: dbErrors.DeleteConstraintError,
  subject: {},
});
dbErrors.create({
  code: 10303,
  status: 403,
  name: 'TokenDeleteConstraintError',
  parent: dbErrors.DeleteConstraintError,
  token: {},
  defaultMessage: 'Not allowed to delete the system-created token.',
  explanation: 'Not allowed to delete the system-created token.',
});

// ----------------------------------------------------------------------------
// Create Constraint Errors
// ----------------------------------------------------------------------------
dbErrors.create({
  code: 10400,
  status: 403,
  name: 'CreateConstraintError',
  parent: dbErrors.FocusDatabaseError,
});

dbErrors.create({
  code: 10401,
  status: 403,
  name: 'SSOConfigCreateConstraintError',
  parent: dbErrors.CreateConstraintError,
  subject: {},
});

// ----------------------------------------------------------------------------
// Permission Errors
// ----------------------------------------------------------------------------
dbErrors.create({
  code: 10500,
  status: 403,
  name: 'AdminUpdateDeleteForbidden',
  parent: dbErrors.FocusDatabaseError,
  range: [],
  defaultMessage: 'Unauthorized.',
  explanation: 'Unauthorized.',
});

dbErrors.create({
  code: 10501,
  status: 403,
  name: 'UpdateDeleteForbidden',
  parent: dbErrors.FocusDatabaseError,
  range: [],
  defaultMessage: 'Unauthorized.',
  explanation: 'Unauthorized.',
});

// ----------------------------------------------------------------------------

module.exports = dbErrors;

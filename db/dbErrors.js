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

const errors = require('errors');

errors.create({
  scope: exports,
  code: 10010,
  name: 'FocusDatabaseError',
});

// ----------------------------------------------------------------------------
// Validation Errors
// ----------------------------------------------------------------------------

errors.create({
  scope: exports,
  code: 10100,
  status: 400,
  name: 'ValidationError',
  parent: this.FocusDatabaseError,
  fields: [],
});
errors.create({
  scope: exports,
  code: 10101,
  status: 400,
  name: 'MissingRequiredFieldError',
  parent: this.ValidationError,
  fields: [],
});
errors.create({
  scope: exports,
  code: 10111,
  status: 400,
  name: 'InvalidProfileReassignmentError',
  parent: this.ValidationError,
  profile: {},
});
errors.create({
  scope: exports,
  code: 10112,
  status: 400,
  name: 'InvalidRangeValuesError',
  parent: this.ValidationError,
  range: [],
  defaultMessage: 'The second element in the range must be greater than or ' +
    'equal to the first element',
});
errors.create({
  scope: exports,
  code: 10113,
  status: 400,
  name: 'InvalidRangeSizeError',
  parent: this.ValidationError,
  range: [],
  defaultMessage: 'A non-null range must include two elements',
});
errors.create({
  scope: exports,
  code: 10114,
  status: 400,
  name: 'ParentSubjectNotFound',
  parent: this.ValidationError,
  defaultMessage: 'Could not find the specified parent for this subject.',
  explanation: 'If a subject specifies that it has a parent, the parent ' +
   'subject must already exist.',
});
errors.create({
  scope: exports,
  code: 10115,
  status: 400,
  name: 'ParentSubjectNotMatch',
  parent: this.ValidationError,
  defaultMessage: 'The parentAbsolutePath and parentId do not match.',
  explanation: 'If a subject specifies both a parentAbsolutePath and a ' +
    'parentId, the parent specified by both fields need to have the same id.',
});
errors.create({
  scope: exports,
  code: 10115,
  status: 400,
  name: 'SubjectAlreadyExistsUnderParent',
  parent: this.ValidationError,
  defaultMessage: 'The new parent already has a subject with the same absolutePath',
  explanation: 'If a subject specifies that it has a parent, the parent' +
  'subject must not already have a child with the same absolutePath',
});
errors.create({
  scope: exports,
  code: 10116,
  status: 400,
  name: 'DuplicateBotError',
  parent: this.ValidationError,
  defaultMessage: 'You cannot have duplicate bots in a room.',
});
errors.create({
  scope: exports,
  code: 10117,
  status: 400,
  name: 'IllegalSelfParenting',
  parent: this.ValidationError,
  defaultMessage: 'A subject may not be its own parent.',
});
errors.create({
  scope: exports,
  code: 10118,
  status: 400,
  name: 'SampleGeneratorContextEncryptionError',
  parent: this.ValidationError,
  defaultMessage: 'Unable to save this Sample Generator with encrypted ' +
  'context data. Please contact your Refocus administrator to set ' +
  'up the encryption algorithm and key to protect any sensitive information ' +
  'you may include in your Sample Generator\'s context',
});
errors.create({
  scope: exports,
  code: 10119,
  status: 400,
  name: 'DuplicateCollectorError',
  parent: this.ValidationError,
  defaultMessage: 'You cannot map duplicate Collectors to a Generator.',
});

// ----------------------------------------------------------------------------
// Not Found
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 10200,
  status: 404,
  name: 'ResourceNotFoundError',
  parent: this.FocusDatabaseError,
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
// Delete Constraint Errors
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 10300,
  status: 403,
  name: 'DeleteConstraintError',
  parent: this.FocusDatabaseError,
});
errors.create({
  scope: exports,
  code: 10301,
  status: 403,
  name: 'ProfileDeleteConstraintError',
  parent: this.DeleteConstraintError,
  profile: {},
});
errors.create({
  scope: exports,
  code: 10302,
  status: 403,
  name: 'SubjectDeleteConstraintError',
  parent: this.DeleteConstraintError,
  subject: {},
});
errors.create({
  scope: exports,
  code: 10303,
  status: 403,
  name: 'TokenDeleteConstraintError',
  parent: this.DeleteConstraintError,
  token: {},
  defaultMessage: 'Not allowed to delete the system-created token.',
  explanation: 'Not allowed to delete the system-created token.',
});

// ----------------------------------------------------------------------------
// Create Constraint Errors
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 10400,
  status: 403,
  name: 'CreateConstraintError',
  parent: this.FocusDatabaseError,
});

errors.create({
  scope: exports,
  code: 10401,
  status: 403,
  name: 'SSOConfigCreateConstraintError',
  parent: this.CreateConstraintError,
  subject: {},
});

// ----------------------------------------------------------------------------
// Permission Errors
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 10500,
  status: 403,
  name: 'AdminUpdateDeleteForbidden',
  parent: this.FocusDatabaseError,
  range: [],
  defaultMessage: 'Unauthorized.',
  explanation: 'Unauthorized.',
});

errors.create({
  scope: exports,
  code: 10501,
  status: 403,
  name: 'UpdateDeleteForbidden',
  parent: this.FocusDatabaseError,
  range: [],
  defaultMessage: 'Unauthorized.',
  explanation: 'Unauthorized.',
});

errors.create({
  scope: exports,
  code: 11400,
  status: 403,
  name: 'ForbiddenError',
  parent: this.FocusDatabaseError,
  range: [],
  defaultMessage: 'Forbidden',
  explanation: 'Forbidden',
});

// ----------------------------------------------------------------------------

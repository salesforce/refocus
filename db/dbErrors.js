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
  code: 10113,
  status: 400,
  name: 'ParentSubjectNotFound',
  parent: dbErrors.ValidationError,
  range: [],
  defaultMessage: 'Could not find the specified parent for this subject.',
  explanation: 'If a subject specifies that it has a parent, the parent' +
   'subject must already exist.'
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

module.exports = dbErrors;

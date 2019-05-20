/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20190516222641-remove-indices-with-isDeleted-deletedAt.js
 *
 * This database migration removes all the indices which include "isDeleted"
 * or "deletedAt" in their list of fields.
 */
'use strict';

module.exports = {
  up: (qi, Seq) => qi.sequelize.transaction(() => Promise.all([
    qi.removeIndex('Aspects', 'AspectUniqueLowercaseNameIsDeleted'),
    qi.removeIndex('Collectors', 'CollectorUniqueLowercaseNameIsDeleted'),
    qi.removeIndex('CollectorGroups',
      'CollectorGroupUniqueLowercaseNameIsDeleted'),
    qi.removeIndex('Generators', 'GeneratorUniqueLowercaseNameIsDeleted'),
    qi.removeIndex('GeneratorTemplates',
      'GTUniqueLowercaseNameVersionIsDeleted'),
    qi.removeIndex('GlobalConfig', 'GlobalConfigUniqueLowercaseKeyIsDeleted'),
    qi.removeIndex('Lenses', 'LensUniqueLowercaseNameIsDeleted'),
    qi.removeIndex('Perspectives', 'PerspectiveUniqueLowercaseNameIsDeleted'),
    qi.removeIndex('Profiles', 'ProfileUniqueLowercaseNameIsDeleted'),
    qi.removeIndex('Subjects', 'SubjectUniqueLowercaseAbsolutePathIsDeleted'),
    qi.removeIndex('Subjects', 'SubjectAbsolutePathDeletedAtIsPublished'),
    qi.removeIndex('Tokens', 'TokenUniqueLowercaseNameCreatedByIsDeleted'),
    qi.removeIndex('Users', 'UserUniqueLowercaseNameIsDeleted'),
  ])),

  /*
   * Note: Separating the second subject index rebuild out from the big
   * Promises.all(...) execution because I don't think we necessarily want the
   * migration to be creating two indexes on the Subjects table at the same
   * time in case that might slow things down.
   */
  down: (qi, Seq) => qi.sequelize.transaction(() => Promise.all([
    qi.addIndex('Aspects',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'AspectUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Collectors',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'CollectorUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('CollectorGroups',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'CollectorGroupUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Generators',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'GeneratorUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('GeneratorTemplates',
      [Seq.fn('lower', Seq.col('name')), 'version', 'isDeleted'],
      {
        name: 'GTUniqueLowercaseNameVersionIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('GlobalConfig',
      [Seq.fn('lower', Seq.col('key')), 'isDeleted'],
      {
        name: 'GlobalConfigUniqueLowercaseKeyIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Lenses',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'LensUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Perspectives',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'PerspectiveUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Profiles',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'ProfileUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Subjects',
      [Seq.fn('lower', Seq.col('absolutePath')), 'isDeleted'],
      {
        name: 'SubjectUniqueLowercaseAbsolutePathIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Tokens',
      [Seq.fn('lower', Seq.col('name')), 'createdBy', 'isDeleted'],
      {
        name: 'TokenUniqueLowercaseNameCreatedByIsDeleted',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('Users',
      [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
      {
        name: 'UserUniqueLowercaseNameIsDeleted',
        unique: true,
      })
      .catch(console.error),
  ])
    .then(() => qi.addIndex('Subjects',
      [Seq.fn('lower', Seq.col('absolutePath')), 'deletedAt', 'isPublished'],
      { name: 'SubjectAbsolutePathDeletedAtIsPublished' })
    )
    .catch(console.error)
  ),
};

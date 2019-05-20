/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20190516222659-create-indices-without-isDeleted-deletedAt.js
 *
 * This database migration creates replacement indices for all the indices
 * which had previously included "isDeleted" or "deletedAt" in their list of
 * fields.
 *
 * Note that there is no "down" functionality here, i.e if the migration fails,
 * we will simply have no indices.
 */
'use strict';

module.exports = {
  /*
   * Note: Separating the second subject index rebuild out from the big
   * Promises.all(...) execution because I don't think we necessarily want the
   * migration to be creating two indexes on the Subjects table at the same
   * time in case that might slow things down.
   */
  up: (qi, Seq) => qi.sequelize.transaction(() => Promise.all([
    qi.addIndex('Aspects', [Seq.fn('lower', Seq.col('name'))], {
      name: 'AspectUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Collectors', [Seq.fn('lower', Seq.col('name'))], {
      name: 'CollectorUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('CollectorGroups', [Seq.fn('lower', Seq.col('name'))], {
      name: 'CollectorGroupUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Generators', [Seq.fn('lower', Seq.col('name'))], {
      name: 'GeneratorUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('GeneratorTemplates',
      [Seq.fn('lower', Seq.col('name')), 'version'],
      {
        name: 'GTUniqueLowercaseNameVersion',
        unique: true,
      })
      .catch(console.error),
    qi.addIndex('GlobalConfig', [Seq.fn('lower', Seq.col('key'))], {
      name: 'GlobalConfigUniqueLowercaseKey',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Lenses', [Seq.fn('lower', Seq.col('name'))], {
      name: 'LensUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Perspectives', [Seq.fn('lower', Seq.col('name'))], {
      name: 'PerspectiveUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Profiles', [Seq.fn('lower', Seq.col('name'))], {
      name: 'ProfileUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Subjects', [Seq.fn('lower', Seq.col('absolutePath'))], {
      name: 'SubjectUniqueLowercaseAbsolutePath',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Tokens', [Seq.fn('lower', Seq.col('name')), 'createdBy'], {
      name: 'TokenUniqueLowercaseNameCreatedBy',
      unique: true,
    })
      .catch(console.error),
    qi.addIndex('Users', [Seq.fn('lower', Seq.col('name'))], {
      name: 'UserUniqueLowercaseName',
      unique: true,
    })
      .catch(console.error),
  ])
    .then(() => qi.addIndex('Subjects',
      [Seq.fn('lower', Seq.col('absolutePath')), 'isPublished'],
      { name: 'SubjectAbsolutePathDeletedAtIsPublished' })
    )
    .catch(console.error)),

  down: (qi, Seq) => Promise.resolve(),
};

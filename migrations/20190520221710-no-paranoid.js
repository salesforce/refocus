/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20190520221710-no-paranoid.js
 *
 * This database migration permanently deletes all the soft-deleted records
 * from tables which had "paranoid" set to true.
 *
 * Note that the "down" function is a no-op -- we do not attempt to add the
 * soft-deleted records back in the event of migration failure.
 */
'use strict';
const Promise = require('bluebird');
const db = require('../db/index');

function destroySoftDeleted() {
  const destroyOpts = {
    where: {
      isDeleted: { [db.Sequelize.Op.gt]: 0 },
    },
    force: true,
  };

  return db.Aspect.destroy(destroyOpts)
    .then((n) => console.log(`[OK] findAndDestroy ${n} Aspects`))
    .catch((err) => console.error('[ERROR] findAndDestroy Aspects', err.message))
    .then(() => db.AuditEvent.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} AuditEvents`))
    .catch((err) => console.error('[ERROR] findAndDestroy AuditEvents', err.message))
    .then(() => db.Collector.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} Collectors`))
    .catch((err) => console.error('[ERROR] findAndDestroy Collectors', err.message))
    .then(() => db.CollectorGroup.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} CollectorGroups`))
    .catch((err) => console.error('[ERROR] findAndDestroy CollectorGroups', err.message))
    .then(() => db.Generator.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} Generators`))
    .catch((err) => console.error('[ERROR] findAndDestroy Generators', err.message))
    .then(() => db.GeneratorTemplate.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} GeneratorTemplates`))
    .catch((err) => console.error('[ERROR] findAndDestroy GeneratorTemplates', err.message))
    .then(() => db.GlobalConfig.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} GlobalConfigs`))
    .catch((err) => console.error('[ERROR] findAndDestroy GlobalConfigs', err.message))
    .then(() => db.Lens.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} Lenses`))
    .catch((err) => console.error('[ERROR] findAndDestroy Lenses', err.message))
    .then(() => db.Perspective.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} Perspectives`))
    .catch((err) => console.error('[ERROR] findAndDestroy Perspectives', err.message))
    .then(() => db.Profile.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} Profiles`))
    .catch((err) => console.error('[ERROR] findAndDestroy Profiles', err.message))
    .then(() => db.SSOConfig.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} SSOConfigs`))
    .catch((err) => console.error('[ERROR] findAndDestroy SSOConfigs', err.message))
    .then(() => db.Subject.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} Subjects`))
    .catch((err) => console.error('[ERROR] findAndDestroy Subjects', err.message))
    .then(() => db.Token.destroy(destroyOpts))
    .then((n) => console.log(`[OK] findAndDestroy ${n} Tokens`))
    .catch((err) => console.error('[ERROR] findAndDestroy Tokens', err.message));
} // findAndDestroy

/**
 * Remove all the indices which include "isDeleted" or "deletedAt" in their
 * list of fields.
 */
function removeOldIndices(qi) {
  return qi.removeIndex('Aspects', 'AspectUniqueLowercaseNameIsDeleted')
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Collectors', 'CollectorUniqueLowercaseNameIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('CollectorGroups', 'CollectorGroupUniqueLowercaseNameIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Generators', 'GeneratorUniqueLowercaseNameIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('GeneratorTemplates', 'GTUniqueLowercaseNameVersionIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('GlobalConfig', 'GlobalConfigUniqueLowercaseKeyIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Lenses', 'LensUniqueLowercaseNameIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Perspectives', 'PerspectiveUniqueLowercaseNameIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Profiles', 'ProfileUniqueLowercaseNameIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Subjects', 'SubjectUniqueLowercaseAbsolutePathIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Subjects', 'SubjectAbsolutePathDeletedAtIsPublished'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => qi.removeIndex('Tokens', 'TokenUniqueLowercaseNameCreatedByIsDeleted'))
    .catch((err) => console.log('ignoring removeOldIndices error:', err.message))
    .then(() => console.log('[OK] removeOldIndices'))
    .catch((err) => console.log('[ERROR]', err.message));
} // removeOldIndices

/**
 * For the "down" operation... restores old indices with the "isDeleted" or
 * "deletedAt" fields in them. Note: Separating the second subject index
 * rebuild out from the big Promises.all(...) execution because I don't think
 * we necessarily want the migration to be creating two indexes on the Subjects
 * table at the same time in case that might slow things down.
 */
function restoreOldIndices(qi, Seq) {
  return qi.sequelize.transaction(() => Promise.all([
      qi.addIndex('Aspects',
        [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
        {
          name: 'AspectUniqueLowercaseNameIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('Collectors',
        [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
        {
          name: 'CollectorUniqueLowercaseNameIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('CollectorGroups',
        [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
        {
          name: 'CollectorGroupUniqueLowercaseNameIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('Generators',
        [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
        {
          name: 'GeneratorUniqueLowercaseNameIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('GeneratorTemplates',
        [Seq.fn('lower', Seq.col('name')), 'version', 'isDeleted'],
        {
          name: 'GTUniqueLowercaseNameVersionIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('GlobalConfigs',
        [Seq.fn('lower', Seq.col('key')), 'isDeleted'],
        {
          name: 'GlobalConfigUniqueLowercaseKeyIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('Lenses',
        [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
        {
          name: 'LensUniqueLowercaseNameIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('Perspectives',
        [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
        {
          name: 'PerspectiveUniqueLowercaseNameIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('Profiles',
        [Seq.fn('lower', Seq.col('name')), 'isDeleted'],
        {
          name: 'ProfileUniqueLowercaseNameIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('Subjects',
        [Seq.fn('lower', Seq.col('absolutePath')), 'isDeleted'],
        {
          name: 'SubjectUniqueLowercaseAbsolutePathIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
      qi.addIndex('Tokens',
        [Seq.fn('lower', Seq.col('name')), 'createdBy', 'isDeleted'],
        {
          name: 'TokenUniqueLowercaseNameCreatedByIsDeleted',
          unique: true,
        })
        .catch((err) => console.log('ignoring restoreOldIndices error:', err.message)),
    ])
      .then(() => qi.addIndex('Subjects',
        [Seq.fn('lower', Seq.col('absolutePath')), 'deletedAt', 'isPublished'],
        { name: 'SubjectAbsolutePathDeletedAtIsPublished' })
      )
      .catch((err) => console.log('ignoring restoreOldIndices error:', err.message))
  )
    .then(() => console.log('[OK] restoreOldIndices'));
} // restoreOldIndices

function createNewIndices(qi, Seq) {
  return qi.sequelize.transaction(() => Promise.all([
      qi.addIndex('Aspects', [Seq.fn('lower', Seq.col('name'))], {
        name: 'AspectUniqueLowercaseName',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('Collectors', [Seq.fn('lower', Seq.col('name'))], {
        name: 'CollectorUniqueLowercaseName',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('CollectorGroups', [Seq.fn('lower', Seq.col('name'))], {
        name: 'CollectorGroupUniqueLowercaseName',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('Generators', [Seq.fn('lower', Seq.col('name'))], {
        name: 'GeneratorUniqueLowercaseName',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('GeneratorTemplates',
        [Seq.fn('lower', Seq.col('name')), 'version'],
        {
          name: 'GTUniqueLowercaseNameVersion',
          unique: true,
        })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('GlobalConfigs', [Seq.fn('lower', Seq.col('key'))], {
        name: 'GlobalConfigUniqueLowercaseKey',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('Lenses', [Seq.fn('lower', Seq.col('name'))], {
        name: 'LensUniqueLowercaseName',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('Perspectives', [Seq.fn('lower', Seq.col('name'))], {
        name: 'PerspectiveUniqueLowercaseName',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('Profiles', [Seq.fn('lower', Seq.col('name'))], {
        name: 'ProfileUniqueLowercaseName',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('Subjects', [Seq.fn('lower', Seq.col('absolutePath'))], {
        name: 'SubjectUniqueLowercaseAbsolutePath',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
      qi.addIndex('Tokens', [Seq.fn('lower', Seq.col('name')), 'createdBy'], {
        name: 'TokenUniqueLowercaseNameCreatedBy',
        unique: true,
      })
        .catch((err) => console.log('ignoring createNewIndices error:', err.message)),
    ])
      .then(() => qi.addIndex('Subjects',
        [Seq.fn('lower', Seq.col('absolutePath')), 'isPublished'],
        { name: 'SubjectAbsolutePathDeletedAtIsPublished' })
      )
      .catch((err) => console.log('ignoring createNewIndices error:', err.message))
      .then(() => console.log('[OK] createNewIndices'))
  );
} // createNewIndices

module.exports = {
  up: (qi, Seq) => destroySoftDeleted()
    .then(() => removeOldIndices(qi))
    .then(() => createNewIndices(qi, Seq))
    .catch((err) => console.trace),
  down: restoreOldIndices,
};

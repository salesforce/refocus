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
 * Note: the *new* indices will get created on db startup *without* any
 * migration code, which means they cannot be created as *unique* until
 * *after* the "destroySoftDeleted" step has completed!
 */
'use strict';
const Promise = require('bluebird');
const db = require('../db/index');
const IS = 'isDeleted';
const AT = 'deletedAt';

function destroySoftDeleted(Seq) {
  const optsIs = {
    where: { isDeleted: { [Seq.Op.gt]: 0 } },
    force: true,
  };
  const optsAt = {
    where: { deletedAt: { [Seq.Op.ne]: null } },
    force: true,
  };
  const exec = (modelName, opts) => db[modelName].destroy(opts)
    .then((n) => console.log(` [OK] destroySoftDeleted ${modelName}: ${n}`))
    .catch((err) =>
      console.log(` [ERR] destroySoftDeleted ${modelName}: ${err.message}`));

  console.log('destroySoftDeleted...');

  /*
   * Why this order?
   * - Generator THEN Collector THEN CollectorGroup so we don't try to delete
   *   a CollectorGroup which is referenced by a Collector or Generator
   * - Generator THEN GeneratorTemplate so we don't try to delete a
   *   GeneratorTemplate which is referenced by a Generator
   * - Perpsective THEN Lens/Subject so we don't try to delete a Lens or
   *   Subject which is referenced by a Perspective
   */
  return Promise.all([
    exec('Aspect', optsIs),
    exec('AuditEvent', optsAt),
    exec('Generator', optsIs),
    exec('GlobalConfig', optsIs),
    exec('Perspective', optsIs),
    exec('Profile', optsIs),
    exec('SSOConfig', optsAt),
    exec('Token', optsIs),
  ])
    .then(() => Promise.all([
      exec('Collector', optsIs),
      exec('GeneratorTemplate', optsIs),
      exec('Lens', optsIs),
      exec('Subject', optsIs),
    ]))
    .then(() => Promise.all([
      exec('CollectorGroup', optsIs),
    ]))
    .then(() => console.log('destroySoftDeleted... done!\n'));
} // destroySoftDeleted

/**
 * Remove all the indices which include "isDeleted" or "deletedAt" in their
 * list of fields.
 */
function removeOldIndices(qi) {
  const exec = (tbl, idx) => qi.removeIndex(tbl, idx)
    .then(() => console.log(` [OK] removeOldIndices ${tbl} ${idx}`))
    .catch((err) =>
      console.log(` [ERR] removeOldIndices ${tbl} ${idx}: ${err.message}`));

  console.log('removeOldIndices...');
  return Promise.all([
    exec('Aspects', 'AspectUniqueLowercaseNameIsDeleted'),
    exec('Collectors', 'CollectorUniqueLowercaseNameIsDeleted'),
    exec('CollectorGroups', 'CollectorGroupUniqueLowercaseNameIsDeleted'),
    exec('Generators', 'GeneratorUniqueLowercaseNameIsDeleted'),
    exec('GeneratorTemplates', 'GTUniqueLowercaseNameVersionIsDeleted'),
    exec('GlobalConfigs', 'GlobalConfigUniqueLowercaseKeyIsDeleted'),
    exec('Lenses', 'LensUniqueLowercaseNameIsDeleted'),
    exec('Perspectives', 'PerspectiveUniqueLowercaseNameIsDeleted'),
    exec('Profiles', 'ProfileUniqueLowercaseNameIsDeleted'),
    exec('Subjects', 'SubjectUniqueLowercaseAbsolutePathIsDeleted'),
    exec('Subjects', 'SubjectAbsolutePathDeletedAtIsPublished'),
    exec('Tokens', 'TokenUniqueLowercaseNameCreatedByIsDeleted'),
  ])
    .then(() => console.log('removeOldIndices... done!\n'));
} // removeOldIndices

function removeFields(qi) {
  const exec = (tbl, col) => qi.removeColumn(tbl, col)
    .then(() => console.log(` [OK] removeFields ${tbl} ${col}`))
    .catch((err) =>
      console.log(` [ERR] removeFields ${tbl} ${col}: ${err.message}`));

  console.log('removeFields...');
  return Promise.all([
    exec('Aspects', IS),
    exec('Collectors', IS),
    exec('CollectorGroups', IS),
    exec('Generators', IS),
    exec('GeneratorTemplates', IS),
    exec('GlobalConfigs', IS),
    exec('Lenses', IS),
    exec('Perspectives', IS),
    exec('Profiles', IS),
    exec('Subjects', IS),
    exec('Tokens', IS),
  ])
    .then(() => Promise.all([
      exec('AuditEvents', AT),
      exec('Aspects', AT),
      exec('Collectors', AT),
      exec('CollectorGroups', AT),
      exec('Generators', AT),
      exec('GeneratorTemplates', AT),
      exec('GlobalConfigs', AT),
      exec('Lenses', AT),
      exec('Perspectives', AT),
      exec('Profiles', AT),
      exec('SSOConfigs', AT),
      exec('Subjects', AT),
      exec('Tokens', AT),
    ]))
    .then(() => console.log('removeFields... done!\n'));
} // removeFields

function dropAndAddUniqueIndices(qi, Seq) {
  const lowerName = Seq.fn('lower', Seq.col('name'));
  const lowerAbsPath = Seq.fn('lower', Seq.col('absolutePath'));
  const lowerKey = Seq.fn('lower', Seq.col('key'));
  const unique = true;
  const exec = (tbl, fields, opts) =>
    qi.sequelize.query(
      `ALTER TABLE "${tbl}" DROP CONSTRAINT IF EXISTS ${opts.name};`)
    .then(() => qi.addIndex(tbl, fields, opts))
    .then(() =>
      console.log(` [OK] dropAndAddUniqueIndices ${tbl} ${opts.name}`))
    .catch((err) =>
      console.log(` [ERR] dropAndAddUniqueIndices ${tbl} ${opts.name}: ${err.message}`));

  console.log('createNewIndices...');
  return Promise.all([
    exec('Aspects', [lowerName],
      { name: 'AspectUniqueLowercaseName', unique }),
    exec('Collectors', [lowerName],
      { name: 'CollectorUniqueLowercaseName', unique }),
    exec('CollectorGroups', [lowerName],
      { name: 'CollectorGroupUniqueLowercaseName', unique }),
    exec('Generators', [lowerName],
      { name: 'GeneratorUniqueLowercaseName', unique }),
    exec('GeneratorTemplates', [lowerName, 'version'],
      { name: 'GTUniqueLowercaseNameVersion', unique }),
    exec('GlobalConfigs', [lowerKey],
      { name: 'GlobalConfigUniqueLowercaseKey', unique }),
    exec('Lenses', [lowerName],
      { name: 'LensUniqueLowercaseName', unique }),
    exec('Perspectives', [lowerName],
      { name: 'PerspectiveUniqueLowercaseName', unique }),
    exec('Profiles', [lowerName],
      { name: 'ProfileUniqueLowercaseName', unique }),
    exec('Subjects', [lowerAbsPath],
      { name: 'SubjectUniqueLowercaseAbsolutePath', unique }),
    exec('Tokens', [lowerName, 'createdBy'],
      { name: 'TokenUniqueLowercaseNameCreatedBy', unique }),
  ])
    .then(() => exec('Subjects', [lowerAbsPath, 'isPublished'],
      { name: 'SubjectAbsolutePathIsPublished' }))
    .then(() => console.log('dropAndAddUniqueIndices... done!\n'));
} // dropAndAddUniqueIndices

function recreateOldFields(qi, Seq) {
  const isDeleted = {
    type: Seq.BIGINT,
    defaultValue: 0,
    allowNull: false,
  };
  const deletedAt = {
    type: Seq.DATE,
    allowNull: true,
  };
  const exec = (tbl, col) =>
    qi.addColumn(tbl, col, (col === 'isDeleted' ? isDeleted : deletedAt))
      .then(() => console.log(` [OK] recreateOldFields ${tbl} ${col}`))
      .catch((err) =>
        console.log(` [ERR] recreateOldFields ${tbl} ${col} ${err.message}`));

  console.log('recreateOldFields...');
  return Promise.all([
    exec('Aspects', IS),
    exec('Collectors', IS),
    exec('CollectorGroups', IS),
    exec('Generators', IS),
    exec('GeneratorTemplates', IS),
    exec('GlobalConfigs', IS),
    exec('Lenses', IS),
    exec('Perspectives', IS),
    exec('Profiles', IS),
    exec('Subjects', IS),
    exec('Tokens', IS),
  ])
    .then(() => Promise.all([
      exec('AuditEvents', AT),
      exec('Aspects', AT),
      exec('Collectors', AT),
      exec('CollectorGroups', AT),
      exec('Generators', AT),
      exec('GeneratorTemplates', AT),
      exec('GlobalConfigs', AT),
      exec('Lenses', AT),
      exec('Perspectives', AT),
      exec('Profiles', AT),
      exec('SSOConfigs', AT),
      exec('Subjects', AT),
      exec('Tokens', AT),
    ]))
    .then(() => console.log('recreateOldFields... done!\n'));
} // recreateOldFields

// /**
//  * For the "down" operation... restores old indices with the "isDeleted" or
//  * "deletedAt" fields in them. Note: Separating the second subject index
//  * rebuild out from the big Promises.all(...) execution because I don't think
//  * we necessarily want the migration to be creating two indexes on the Subjects
//  * table at the same time in case that might slow things down.
//  */
// function recreateOldIndices(qi, Seq) {
//   const lowerName = Seq.fn('lower', Seq.col('name'));
//   const lowerAbsPath = Seq.fn('lower', Seq.col('absolutePath'));
//   const lowerKey = Seq.fn('lower', Seq.col('key'));
//   const unique = true;
//   const exec = (tbl, fields, opts) => qi.addIndex(tbl, fields, opts)
//     .then(() => console.log(` [OK] recreateOldIndices ${tbl} ${opts.name}`))
//     .catch((err) =>
//       console.log(` [ERR] recreateOldIndices ${tbl} ${opts.name}: ${err.message}`));
//
//   console.log('recreateOldIndices...');
//   return Promise.all([
//     exec('Aspects', [lowerName, IS],
//       { name: 'AspectUniqueLowercaseNameIsDeleted', unique }),
//     exec('Collectors', [lowerName, IS],
//       { name: 'CollectorUniqueLowercaseNameIsDeleted', unique }),
//     exec('CollectorGroups', [lowerName, IS],
//       { name: 'CollectorGroupUniqueLowercaseNameIsDeleted', unique }),
//     exec('Generators', [lowerName, IS],
//       { name: 'GeneratorUniqueLowercaseNameIsDeleted', unique }),
//     exec('GeneratorTemplates', [lowerName, 'version', IS],
//       { name: 'GTUniqueLowercaseNameVersionIsDeleted', unique }),
//     exec('GlobalConfigs', [lowerKey, IS],
//       { name: 'GlobalConfigUniqueLowercaseKeyIsDeleted', unique }),
//     exec('Lenses', [lowerName, IS],
//       { name: 'LensUniqueLowercaseNameIsDeleted', unique }),
//     exec('Perspectives', [lowerName, IS],
//       { name: 'PerspectiveUniqueLowercaseNameIsDeleted', unique }),
//     exec('Profiles', [lowerName, IS],
//       { name: 'ProfileUniqueLowercaseNameIsDeleted', unique }),
//     exec('Subjects', [lowerAbsPath, IS],
//       { name: 'SubjectUniqueLowercaseAbsolutePathIsDeleted', unique }),
//     exec('Tokens', [lowerName, 'createdBy', IS],
//       { name: 'TokenUniqueLowercaseNameCreatedByIsDeleted', unique }),
//   ])
//     .then(() => exec('Subjects', [lowerAbsPath, AT, 'isPublished'],
//       { name: 'SubjectAbsolutePathDeletedAtIsPublished' }))
//     .then(() => console.log('recreateOldIndices... done!\n'));
// } // recreateOldIndices

function removeNewIndices(qi) {
  const exec = (tbl, idx) => qi.removeIndex(tbl, idx)
    .then(() => console.log(` [OK] removeNewIndices ${tbl} ${idx}`))
    .catch((err) =>
      console.log(` [ERR] removeNewIndices ${tbl} ${idx}: ${err.message}`));

  console.log('removeNewIndices...');
  return Promise.all([
    exec('Aspects', 'AspectUniqueLowercaseName'),
    exec('Collectors', 'CollectorUniqueLowercaseName'),
    exec('CollectorGroups', 'CollectorGroupUniqueLowercaseName'),
    exec('Generators', 'GeneratorUniqueLowercaseName'),
    exec('GeneratorTemplates', 'GTUniqueLowercaseNameVersion'),
    exec('GlobalConfig', 'GlobalConfigUniqueLowercaseKey'),
    exec('Lenses', 'LensUniqueLowercaseName'),
    exec('Perspectives', 'PerspectiveUniqueLowercaseName'),
    exec('Profiles', 'ProfileUniqueLowercaseName'),
    exec('Subjects', 'SubjectUniqueLowercaseAbsolutePath'),
    exec('Subjects', 'SubjectAbsolutePathIsPublished'),
    exec('Tokens', 'TokenUniqueLowercaseNameCreatedBy'),
  ])
    .then(() => console.log('removeNewIndices... done!\n'));
} // removeNewIndices

module.exports = {
  up: (qi, Seq) => destroySoftDeleted(Seq)
    .then(() => removeOldIndices(qi))
    .then(() => removeFields(qi))
    .then(() => dropAndAddUniqueIndices(qi, Seq)),
  down: (qi, Seq) => recreateOldFields(qi, Seq)
    .then(() => removeNewIndices(qi)),
};

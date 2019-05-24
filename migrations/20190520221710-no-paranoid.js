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

/**
 * In case there are collectors which reference a soft-deleted collector group
 *
 * @param qi
 * @param Seq
 * @returns {*}
 */
function fixReferences(qi) {
  console.log('fixReferences...');
  return qi.sequelize.query(
    `UPDATE "Collectors" SET "collectorGroupId" = NULL ` +
    `WHERE "collectorGroupId" IN ` +
    `  (SELECT id FROM "CollectorGroups" WHERE "isDeleted" > 0)`
  )
    .catch((err) => console.log(` [ERR] fixReferences: ${err.message}`))
    .then((n) => console.log(` [OK] fixReferences cleared soft-deleted ` +
      `collectorGroupId from Collectors records: ${JSON.stringify(n)}`))
    .then(() => console.log('fixReferences... done!\n'));
} // fixReferences

function destroySoftDeleted(qi, Seq) {
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
  return qi.sequelize.transaction(() => Promise.all([
    exec('Aspect', optsIs),
    exec('AuditEvent', optsAt),
    exec('Generator', optsIs),
    exec('GlobalConfig', optsIs),
    exec('Perspective', optsIs),
    exec('Profile', optsIs),
    exec('SSOConfig', optsAt),
    exec('Token', optsIs),
    exec('Collector', optsIs),
    exec('GeneratorTemplate', optsIs),
    exec('Lens', optsIs),
    exec('Subject', optsIs),
    exec('CollectorGroup', optsIs),
  ]))
    .catch((err) => console.log(` [ERR] destroySoftDeleted: ${err.message}`))
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
    .catch((err) => console.log(` [ERR] removeOldIndices: ${err.message}`))
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
    .catch((err) => console.log(` [ERR] removeFields: ${err.message}`))
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
    .catch((err) => console.log(` [ERR] removeFields: ${err.message}`))
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
      .then(() => console.log(` [OK] dropAndAddUniqueIndices DROP ` +
        `CONSTRAINT ${tbl} ${opts.name}`))
      .catch((err) => console.log(` [ERR] dropAndAddUniqueIndices DROP ` +
        `CONSTRAINT ${tbl} ${opts.name}: ${err.message}`))
      .then(() => qi.addIndex(tbl, fields, opts))
      .then(() =>
        console.log(` [OK] dropAndAddUniqueIndices ADD INDEX ` +
          `${tbl} ${opts.name}`))
      .catch((err) => console.log(` [ERR] dropAndAddUniqueIndices ADD INDEX ` +
        `${tbl} ${opts.name}: ${err.message}`));

  console.log('dropAndAddUniqueIndices...');
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
    .catch((err) =>
      console.log(` [ERR] dropAndAddUniqueIndices ${err.message}`))
    .then(() => exec('Subjects', [lowerAbsPath, 'isPublished'],
      { name: 'SubjectAbsolutePathIsPublished' }))
    .catch((err) =>
      console.log(` [ERR] dropAndAddUniqueIndices ${err.message}`))
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
    .catch((err) => console.log(` [ERR] recreateOldFields ${err.message}`))
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
    .catch((err) => console.log(` [ERR] recreateOldFields ${err.message}`))
    .then(() => console.log('recreateOldFields... done!\n'));
} // recreateOldFields

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
    .catch((err) => console.log(` [ERR] removeNewIndices ${err.message}`))
    .then(() => console.log('removeNewIndices... done!\n'));
} // removeNewIndices

module.exports = {
  up: (qi, Seq) => fixReferences(qi)
    .then(() => destroySoftDeleted(qi, Seq))
    .then(() => removeOldIndices(qi))
    .then(() => removeFields(qi))
    .then(() => dropAndAddUniqueIndices(qi, Seq)),
  down: (qi, Seq) => recreateOldFields(qi, Seq)
    .then(() => removeNewIndices(qi)),
};

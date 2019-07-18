/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20190603225918-no-paranoid.js
 *
 * Note: the *new* indices will get created on db startup *without* any
 * migration code, which means they cannot be created as *unique* until
 * *after* the "destroySoftDeleted" step has completed!
 */
'use strict';
const Promise = require('bluebird');
const db = require('../db/index');
const logger = require('../logger');

const IS = 'isDeleted';
const AT = 'deletedAt';

/**
 * If a collector references a soft-deleted collector group, clear that
 * collector group from the collector.
 *
 * If a perspective references a soft-deleted lens, delete the perspective
 * (since it obviously has not been used).
 *
 * @param qi
 * @param Seq
 * @returns {*}
 */
function fixReferences(qi) {
  logger.info('fixReferences...');
  return qi.sequelize.query(
    `UPDATE "Collectors" SET "collectorGroupId" = NULL ` +
    `WHERE "collectorGroupId" IN ` +
    `  (SELECT id FROM "CollectorGroups" WHERE "isDeleted" > 0)`
  )
    .catch((err) => logger.info(` [ERR] fixReferences: ${err.message}`))
    .then((n) => logger.info(` [OK] fixReferences cleared soft-deleted ` +
      `collectorGroupId from Collectors records: ${JSON.stringify(n)}`))
    .then(() => qi.sequelize.query(`DELETE FROM "Perspectives" ` +
      `WHERE "lensId" IN (SELECT id FROM "Lenses" WHERE "isDeleted" > 0)`))
    .catch((err) => logger.info(` [ERR] fixReferences: ${err.message}`))
    .then((n) => logger.info(` [OK] fixReferences deleted Perspectives ` +
      `which have soft-deleted lensId: ${JSON.stringify(n)}`))
    .then(() => logger.info('fixReferences... done!\n'));
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
    .then((n) => logger.info(` [OK] destroySoftDeleted ${modelName}: ${n}`))
    .catch((err) =>
      logger.info(` [ERR] destroySoftDeleted ${modelName}: ${err.message}`));

  logger.info('destroySoftDeleted...');

  return qi.sequelize.transaction(() => Promise.all([
    exec('Aspect', optsIs),
    exec('AuditEvent', optsAt),
    exec('Generator', optsIs),
    exec('GlobalConfig', optsIs),
    exec('Perspective', optsIs),
    exec('SSOConfig', optsAt),
    exec('Token', optsIs),
    exec('Collector', optsIs),
    exec('GeneratorTemplate', optsIs),
    exec('Lens', optsIs),
    exec('Subject', optsIs),
    exec('CollectorGroup', optsIs),
  ]))
    .catch((err) => logger.info(` [ERR] destroySoftDeleted: ${err.message}`))
    .then(() => logger.info('destroySoftDeleted... done!\n'));
} // destroySoftDeleted

/**
 * Remove all the indices which include "isDeleted" or "deletedAt" in their
 * list of fields.
 */
function removeOldIndices(qi) {
  const exec = (tbl, idx) => qi.removeIndex(tbl, idx)
    .then(() => logger.info(` [OK] removeOldIndices ${tbl} ${idx}`))
    .catch((err) =>
      logger.info(` [ERR] removeOldIndices ${tbl} ${idx}: ${err.message}`));

  logger.info('removeOldIndices...');
  return Promise.all([
    exec('Aspects', 'AspectUniqueLowercaseNameIsDeleted'),
    exec('Collectors', 'CollectorUniqueLowercaseNameIsDeleted'),
    exec('CollectorGroups', 'CollectorGroupUniqueLowercaseNameIsDeleted'),
    exec('Generators', 'GeneratorUniqueLowercaseNameIsDeleted'),
    exec('GeneratorTemplates', 'GTUniqueLowercaseNameVersionIsDeleted'),
    exec('GlobalConfigs', 'GlobalConfigUniqueLowercaseKeyIsDeleted'),
    exec('Lenses', 'LensUniqueLowercaseNameIsDeleted'),
    exec('Perspectives', 'PerspectiveUniqueLowercaseNameIsDeleted'),
    exec('Subjects', 'SubjectUniqueLowercaseAbsolutePathIsDeleted'),
    exec('Subjects', 'SubjectAbsolutePathDeletedAtIsPublished'),
    exec('Tokens', 'TokenUniqueLowercaseNameCreatedByIsDeleted'),
  ])
    .catch((err) => logger.info(` [ERR] removeOldIndices: ${err.message}`))
    .then(() => logger.info('removeOldIndices... done!\n'));
} // removeOldIndices

function removeFields(qi) {
  const exec = (tbl, col) => qi.removeColumn(tbl, col)
    .then(() => logger.info(` [OK] removeFields ${tbl} ${col}`))
    .catch((err) =>
      logger.info(` [ERR] removeFields ${tbl} ${col}: ${err.message}`));

  logger.info('removeFields...');
  return Promise.all([
    exec('Aspects', IS),
    exec('Collectors', IS),
    exec('CollectorGroups', IS),
    exec('Generators', IS),
    exec('GeneratorTemplates', IS),
    exec('GlobalConfigs', IS),
    exec('Lenses', IS),
    exec('Perspectives', IS),
    exec('Subjects', IS),
    exec('Tokens', IS),
  ])
    .catch((err) => logger.info(` [ERR] removeFields: ${err.message}`))
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
      exec('SSOConfigs', AT),
      exec('Subjects', AT),
      exec('Tokens', AT),
    ]))
    .catch((err) => logger.info(` [ERR] removeFields: ${err.message}`))
    .then(() => logger.info('removeFields... done!\n'));
} // removeFields

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
      .then(() => logger.info(` [OK] recreateOldFields ${tbl} ${col}`))
      .catch((err) =>
        logger.info(` [ERR] recreateOldFields ${tbl} ${col} ${err.message}`));

  logger.info('recreateOldFields...');
  return Promise.all([
    exec('Aspects', IS),
    exec('Collectors', IS),
    exec('CollectorGroups', IS),
    exec('Generators', IS),
    exec('GeneratorTemplates', IS),
    exec('GlobalConfigs', IS),
    exec('Lenses', IS),
    exec('Perspectives', IS),
    exec('Subjects', IS),
    exec('Tokens', IS),
  ])
    .catch((err) => logger.info(` [ERR] recreateOldFields ${err.message}`))
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
      exec('SSOConfigs', AT),
      exec('Subjects', AT),
      exec('Tokens', AT),
    ]))
    .catch((err) => logger.info(` [ERR] recreateOldFields ${err.message}`))
    .then(() => logger.info('recreateOldFields... done!\n'));
} // recreateOldFields

function removeNewIndices(qi) {
  const exec = (tbl, idx) => qi.removeIndex(tbl, idx)
    .then(() => logger.info(` [OK] removeNewIndices ${tbl} ${idx}`))
    .catch((err) =>
      logger.info(` [ERR] removeNewIndices ${tbl} ${idx}: ${err.message}`));

  logger.info('removeNewIndices...');
  return Promise.all([
    exec('Aspects', 'AspectUniqueLowercaseName'),
    exec('Collectors', 'CollectorUniqueLowercaseName'),
    exec('CollectorGroups', 'CollectorGroupUniqueLowercaseName'),
    exec('Generators', 'GeneratorUniqueLowercaseName'),
    exec('GeneratorTemplates', 'GTUniqueLowercaseNameVersion'),
    exec('GlobalConfig', 'GlobalConfigUniqueLowercaseKey'),
    exec('Lenses', 'LensUniqueLowercaseName'),
    exec('Perspectives', 'PerspectiveUniqueLowercaseName'),
    exec('Subjects', 'SubjectUniqueLowercaseAbsolutePath'),
    exec('Subjects', 'SubjectAbsolutePathIsPublished'),
    exec('Tokens', 'TokenUniqueLowercaseNameCreatedBy'),
  ])
    .catch((err) => logger.info(` [ERR] removeNewIndices ${err.message}`))
    .then(() => logger.info('removeNewIndices... done!\n'));
} // removeNewIndices

module.exports = {
  up: (qi, Seq) => fixReferences(qi)
    .then(() => destroySoftDeleted(qi, Seq))
    .then(() => removeOldIndices(qi))
    .then(() => removeFields(qi)),
  down: (qi, Seq) => recreateOldFields(qi, Seq)
    .then(() => removeNewIndices(qi)),
};

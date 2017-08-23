/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
const table = 'Profiles';
const ca = 'collectorAccess';
const ga = 'generatorAccess';
const gta = 'generatorTemplateAccess';
const colEnum = {
  collectorAccess: 'enum_Profiles_collectorAccess',
  generatorAccess: 'enum_Profiles_generatorAccess',
  generatorTemplateAccess: 'enum_Profiles_generatorTemplateAccess',
};

function dropEnum(qi, e) {
  return qi.sequelize.query(`DROP TYPE IF EXISTS "${e}";`)
  .catch((err) => true);
}

function dropCol(qi, col) {
  return qi.removeColumn(table, col)
  .catch((err) => true);
}

function addCol(qi, col, opts) {
  return dropEnum(qi, colEnum[col])
  .then(() => qi.addColumn(table, col, opts));
}

module.exports = {
  up: (qi, Seq) => {
    const opts = {
      type: Seq.ENUM('r', 'rw'),
      defaultValue: 'r',
    };
    let attributes;
    return qi.sequelize.transaction(
      () => qi.describeTable(table)
      .then((described) => attributes = described)
      .then(() => attributes.hasOwnProperty(ca))
      .then((colExists) => colExists ? true : addCol(qi, ca, opts))
      .then(() => attributes.hasOwnProperty(ga))
      .then((colExists) => colExists ? true : addCol(qi, ga, opts))
      .then(() => attributes.hasOwnProperty(gta))
      .then((colExists) => colExists ? true : addCol(qi, gta, opts))
    );
  },

  down: (qi) => qi.sequelize.transaction(
    () => dropCol(qi, ca)
    .then(() => dropCol(qi, ga))
    .then(() => dropCol(qi, gta))
    .then(() => dropEnum(qi, colEnum[ca]))
    .then(() => dropEnum(qi, colEnum[ga]))
    .then(() => dropEnum(qi, colEnum[gta]))
  ),
};

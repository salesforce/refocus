'use strict';
const db = require('../db/index');
const constants = require('../db/constants');
const Promise = require('bluebird');

const modelsAndCols = {
  Aspect: ['tags', 'relatedLinks'],
  Generator: ['tags'],
  GeneratorTemplate: ['tags'],
  Perspective:
    ['aspectFilter', 'aspectTagFilter', 'subjectTagFilter', 'statusFilter'],
};

function updateRowsAndColumns(qi, seq, modelName, colNamesArr) {
  const whereArr = [];
  colNamesArr.forEach((cname) => {
    const o = {};
    o[cname] = { $eq: null };
    whereArr.push(o);
  });

  const model = db[modelName];
  return model.findAll({ // find records with any of given columns = null
    where: { $or: whereArr }, paranoid: false,
  })
    .then((records) => Promise.mapSeries(records, (record) => {
      const toUpdate = {};
      colNamesArr.forEach((colName) => {
        if (record[colName] === null) {
          toUpdate[colName] = []; // set the record column to empty array
        }
      });

      return record.update(toUpdate);
    }))
    .then(() => Promise.mapSeries(colNamesArr, (colName) => {
      if (colName === 'relatedLinks') {
        return qi.changeColumn(`${modelName}s`, colName, {
          type: seq.ARRAY(seq.JSON),
          allowNull: false, // change relatedLinks column to allowNull: false
          defaultValue: constants.defaultJsonArrayValue,
        });
      }

      return qi.changeColumn(`${modelName}s`, colName, {
        type: seq.ARRAY(seq.STRING(constants.fieldlen.normalName)),
        allowNull: false, // change tags column to allowNull: false
        defaultValue: constants.defaultArrayValue,
      });
    }));
}

module.exports = {
  up: (qi, seq) => Promise.mapSeries(Object.keys(modelsAndCols), (model) =>
    updateRowsAndColumns(qi, seq, model, modelsAndCols[model])),

  down: (qi, seq) => Promise.mapSeries(
    Object.keys(modelsAndCols), (modelName) => {
      const colNamesArr = modelsAndCols[modelName];
      return Promise.mapSeries(colNamesArr, (colName) => {
        if (colName === 'relatedLinks') {
          return qi.changeColumn(`${modelName}s`, colName, {
            type: seq.ARRAY(seq.JSON),
            allowNull: true, // change relatedLinks column to allowNull: true
            defaultValue: constants.defaultJsonArrayValue,
          });
        }

        return qi.changeColumn(`${modelName}s`, colName, {
          type: seq.ARRAY(seq.STRING(constants.fieldlen.normalName)),
          allowNull: true, // change tags column to allowNull: false
          defaultValue: constants.defaultArrayValue,
        });
      });
    }),
};

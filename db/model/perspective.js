/**
 * db/model/perspective.js
 */
'use strict'; // eslint-disable-line strict

const common = require('../helpers/common');
const MissingRequiredFieldError = require('../dbErrors')
  .MissingRequiredFieldError;
const constants = require('../constants');

const assoc = {};

module.exports = function perspective(seq, dataTypes) {
  const Perspective = seq.define('Perspective', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    rootSubject: {
      type: dataTypes.STRING(constants.fieldlen.longish),
      allowNull: false,
    },
    aspectFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: true,
    },
    aspectTagFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: true,
    },
    subjectTagFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: true,
    },
    statusFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING),
      allowNull: true,
    },
  }, {
    classMethods: {
      getPerspectiveAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.createdBy = Perspective.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
        assoc.lens = Perspective.belongsTo(models.Lens, {
          as: 'lens',
          foreignKey: {
            name: 'lensId',
            allowNull: false,
          },
        });
        Perspective.addScope('defaultScope', {
          include: [

            // assoc.createdBy,
            {
              association: assoc.lens,
              attributes: [
                'helpEmail',
                'helpUrl',
                'id',
                'name',
                'thumbnailUrl',
                'version',
              ],
            },
          ],
          order: ['Perspective.name'],
        }, {
          override: true,
        });
      },
    },
    hooks: {
      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      },
    },
    indexes: [
      { unique: true, fields: ['name', 'isDeleted'] },
    ],
    paranoid: true,
    validate: {
      lensIdNotNull() {
        if (!this.lensId) {
          const err = new MissingRequiredFieldError();
          err.fields = ['lensId'];
          throw err;
        }
      }, // lensIdNotNull
    },
  });
  return Perspective;
};

/**
 * db/model/tag.js
 */

const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function tag(seq, dataTypes) {
  const Tag = seq.define('Tag', {
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
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    associatedModelName: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'Name of the associated model.',
    },
    associationId: {
      type: dataTypes.UUID,
      allowNull: false,
      comment: 'Foriegn Key for the model',
    },
  }, {
    classMethods: {
      getTagAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.subject = Tag.belongsTo(models.Subject, {
          as: 'subject',
          foreignKey: 'associationId',
          constraints: false,
        });
        assoc.aspect = Tag.belongsTo(models.Aspect, {
          as: 'aspect',
          foreignKey: 'associationId',
          constraints: false,
        });
      },
    },
    defaultScope: {
      order: ['Tag.name'],
    },
    hooks: {

      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      }, // hooks.beforeDestroy

    }, // hooks
    indexes: [
      { unique: true, fields: ['name', 'isDeleted', 'associationId'] },
    ],
    paranoid: true,
  });
  return Tag;
}; // exports

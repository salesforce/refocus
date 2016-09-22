/**
 * db/model/globalconfig.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const GlobalConfig = seq.define('GlobalConfig', {
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
    key: {
      type: dataTypes.STRING(256),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    value: {
      type: dataTypes.STRING,
      allowNull: true,
    },
  }, {
    classMethods: {
      getGlobalConfigAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.createdBy = GlobalConfig.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
      },
    },
    hooks: {
      /**
       * Set the isDeleted timestamp.
       *
       * @param {Aspect} inst - The instance being destroyed
       * @returns {Promise}
       */
      beforeDestroy(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          common.setIsDeleted(seq.Promise, inst)
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeDestroy
    }, // hooks
    indexes: [
      {
        name: 'GlobalConfigUniqueLowercaseKeyIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('key')),
          'isDeleted',
        ],
      },
    ],
    paranoid: true,
  });
  return GlobalConfig;
};

'use strict';
const constants = require('../db/constants');

module.exports = {
  up(qi, Seq) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

    */
    return qi.sequelize.transaction(() =>
    qi.addColumn('AuditEvents', 'loggedAt', {
      defaultValue: Date.now(),
      type: Seq.DATE,
    })
    .then(() => qi.changeColumn('AuditEvents', 'details', {
      type: Seq.JSONB,
      defaultValue: constants.defaultJSONValue,
      allowNull: false,
    }))
    );
  },

  down(qi, Seq) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
    */
    return qi.sequelize.transaction(() =>
    qi.removeColumn('AuditEvents', 'loggedAt')
    .then(() => qi.changeColumn('AuditEvents', 'details', {
      type: Seq.JSONB,
      allowNull: false,
    }))
    );
  },
};

'use strict';

module.exports = {
  up(qi, Seq) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

    */
    return qi.sequelize.transaction(() =>
    qi.changeColumn('Samples', 'name', {
      type: Seq.STRING(4157), // eslint-disable-line no-magic-numbers
    }));
  },

  down(qi, Seq) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
    */
    return qi.sequelize.transaction(() =>
    qi.changeColumn('Samples', 'name', {
      type: Seq.STRING(4096), // eslint-disable-line no-magic-numbers
    }));
  },
};

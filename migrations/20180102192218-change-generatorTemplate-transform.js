'use strict';

module.exports = {
  up: function (qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.changeColumn('GeneratorTemplates', 'transform', {
      type: Sequelize.JSON(),
      allowNull: false,
    });
  },

  down: function (qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.dropTable('users');
    */
    return qi.changeColumn('GeneratorTemplates', 'transform', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
  }
};

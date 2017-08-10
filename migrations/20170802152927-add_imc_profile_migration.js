module.exports = {
  up: function (qi, Sequelize) {
    qi.sequelize.query('SELECT * FROM "Profiles" LIMIT 1',
      { type: qi.sequelize.QueryTypes.SELECT })
    .then((profiles) => {
      const profile = profiles[0];
      if (!profile.hasOwnProperty('botAccess')) {
        qi.addColumn('Profiles', 'botAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      }
      return profile;
    })
    .then((profile) => {
      if (!profile.hasOwnProperty('eventAccess')) {
        qi.addColumn('Profiles', 'eventAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      }
      return profile;
    })
    .then((profile) => {
      if (!profile.hasOwnProperty('roomAccess')) {
        qi.addColumn('Profiles', 'roomAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'rw',
        });
      }
      return profile;
    })
    .then((profile) => {
      if (!profile.hasOwnProperty('roomTypeAccess')) {
        qi.addColumn('Profiles', 'roomTypeAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      }
    });
  },

  down: function (qi, Sequelize) {
    qi.sequelize.query('SELECT * FROM "Profiles" LIMIT 1',
      { type: qi.sequelize.QueryTypes.SELECT })
    .then((profiles) => {
      const profile = profiles[0];
      if (profile.hasOwnProperty('botAccess')) {
        qi.removeColumn('Profiles', 'botAccess');
      }
      return profile;
    })
    .then((profile) => {
      if (profile.hasOwnProperty('eventAccess')) {
        qi.removeColumn('Profiles', 'eventAccess');
      }
      return profile;
    })
    .then((profile) => {
      if (profile.hasOwnProperty('roomAccess')) {
        qi.removeColumn('Profiles', 'roomAccess');
      }
      return profile;
    })
    .then((profile) => {
      if (profile.hasOwnProperty('roomTypeAccess')) {
        qi.removeColumn('Profiles', 'roomTypeAccess');
      }
    });
  },
};

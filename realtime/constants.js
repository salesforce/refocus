/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * realtime/constants.js
 */
'use strict';

const bot = {
  client: 'pubBot',
  channel: 'botChannelName',
  roomFilterIndex: 0,
  botActionFilterIndex: 1,
  botDataFilterIndex: 2,
  botEventFilterIndex: 3,
};

module.exports = {
  asbPathIndex: 0,

  aspectFilterIndex: 1,

  subjectTagFilterIndex: 2,

  aspectTagFilterIndex: 3,

  statusFilterIndex: 4,

  filterSeperator: '&',

  valuesSeparator: ';',

  fieldTypeFieldSeparator: '=',

  filterTypeInclude: 'INCLUDE',

  events: {
    subject: {
      add: 'refocus.internal.realtime.subject.add',
      upd: 'refocus.internal.realtime.subject.update',
      del: 'refocus.internal.realtime.subject.remove',
    },

    botAction: {
      add: 'refocus.internal.realtime.bot.action.add',
      upd: 'refocus.internal.realtime.bot.action.update',
      del: 'refocus.internal.realtime.bot.action.remove',
    },

    botData: {
      add: 'refocus.internal.realtime.bot.data.add',
      upd: 'refocus.internal.realtime.bot.data.update',
      del: 'refocus.internal.realtime.bot.data.remove',
    },

    botEvent: {
      add: 'refocus.internal.realtime.bot.event.add',
      upd: 'refocus.internal.realtime.bot.event.update',
      del: 'refocus.internal.realtime.bot.event.remove',
    },

    room: {
      add: 'refocus.internal.realtime.bot.namespace.initialize',
      upd: 'refocus.internal.realtime.room.settingsChanged',
      del: 'refocus.internal.realtime.room.remove',
    },

    sample: {
      add: 'refocus.internal.realtime.sample.add',
      upd: 'refocus.internal.realtime.sample.update',
      del: 'refocus.internal.realtime.sample.remove',
      nc: 'refocus.internal.realtime.sample.nochange',
    },

    perspective: {
      initialize: 'refocus.internal.realtime.perspective.namespace.initialize',
    },
  },

  bot,

  pubOpts: {
    botAction: {
      client: bot.client,
      channel: bot.channel,
      filterIndex: bot.botActionFilterIndex,
      filterField: 'name',
    },
    botData: {
      client: bot.client,
      channel: bot.channel,
      filterIndex: bot.botDataFilterIndex,
      filterField: 'name',
    },
    event: {
      client: bot.client,
      channel: bot.channel,
      filterIndex: bot.botEventFilterIndex,
      filterField: 'id',
    },
    room: {
      client: bot.client,
      channel: bot.channel,
      filterIndex: bot.roomFilterIndex,
      filterField: 'name',
    },

  },

  pubStatsHash: 'pubstats',
};

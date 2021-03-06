'use strict';
require('sinon-as-promised');

const knownEnvVarNames = [
  'TRELLO_API_KEY', 'TRELLO_CLIENT_SECRET', 'TRELLO_API_TOK',
  'ATC_TRELLO_BOARD_ID', 'BPA_TRELLO_BOARD_ID', 'LOCALTUNNEL',
  'PORT'
];

module.exports = {
  resetEnvVars() {
    for (const name of knownEnvVarNames) {
      delete process.env[name];
    }
  }
};

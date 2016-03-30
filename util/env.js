'use strict';

require('dotenv').config();
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

const knownEnvs = [
  'TRELLO_API_KEY',
  'TRELLO_CLIENT_SECRET',
  'TRELLO_API_TOK',
  'ATC_TRELLO_BOARD_ID',
  'BPA_TRELLO_BOARD_ID',
  'LOCALTUNNEL',
  'HOST',
  'LOG_LEVEL'
]

if (appEnv.getServices() && Object.keys(appEnv.getServices()).length) {
  // If running on Cloud Foundry
  for(const env of knownEnvs) {
    process.env[env] = appEnv.getServiceCreds('atc-trello-cups')[env];
  }
}

'use strict';

const log = require('./logger')('get hostname');

module.exports = function getHostname(port) {
  if (process.env.HOST) {
    log.verbose(`Using env host (${process.env.HOST})`);
    return Promise.resolve(process.env.HOST);
  } else if (process.env.LOCALTUNNEL === 'true') {
    log.verbose('Setting up localtunnel...');
    return new Promise((resolve, reject) => {
      const lt = require('localtunnel');
      lt(port, /* { host: 'https://localtunnel.18f.gov' },*/ (err, tunnel) => {
        if (err) {
          return reject(err);
        }

        tunnel.on('close', () => {
          log.info('localtunnel has closed');
        });

        log.verbose(`Got localtunnel host (${tunnel.url})`);
        return resolve(tunnel.url);
      });
    });
  }
  return Promise.reject(new Error('HOST not set, and LOCALTUNNEL not enabled'));
};

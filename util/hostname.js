module.exports = function getHostname(port) {
  if(process.env.HOST) {
    return Promise.resolve(process.env.HOST);
  } else if(process.env.LOCALTUNNEL === 'true') {
    return new Promise((resolve, reject) => {
      const lt = require('localtunnel');
      lt(port, /*{ host: 'https://localtunnel.18f.gov' },*/ (err, tunnel) => {
        if(err) {
          return reject(err);
        }

        tunnel.on('close', () => {
          console.log('localtunnel has closed');
        });

        return resolve(tunnel.url);
      });
    });
  }
  return Promise.reject(new Error('HOST not set, and LOCALTUNNEL not enabled'));
}

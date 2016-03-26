'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

module.exports = function(yamlFile) {
  return new Promise((resolve, reject) => {
    fs.readFile(yamlFile, 'utf8', function(err, data) {
      if(err) {
        reject(err);
      }
      resolve(yaml.safeLoad(data));
    });
  });
}

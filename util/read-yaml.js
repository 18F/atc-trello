'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

module.exports = function(yamlFile) {
  return new Promise((resolve, reject) => {
    fs.readFile(yamlFile, 'utf8', function(err, data) {
      if(err) {
        throw new Error(err);
      }
      resolve(yaml.safeLoad(data));
    });
  });
}

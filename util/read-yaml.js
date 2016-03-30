'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

module.exports = function loadYaml(yamlFile) {
  return new Promise((resolve, reject) => {
    fs.readFile(yamlFile, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(yaml.safeLoad(data));
    });
  });
};

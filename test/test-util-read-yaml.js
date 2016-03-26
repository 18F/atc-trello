"use strict";

const tap = require('tap');
const path = require('path');
const utils = require('../util');

tap.test('read-yaml util', t1 => {
  t1.test('with invalid filename', t2 => {
    utils.readYaml('none').then(() => {
      t2.fail('resolves instead of rejecting');
      t2.done();
    }).catch(() => {
      t2.pass('rejects');
      t2.done();
    })
  });

  t1.test('with valid file', t2 => {
    utils.readYaml(path.join(__dirname, 'test-valid.yaml')).then(obj => {
      t2.equal(typeof obj, 'object', 'resolves an object');
      t2.done();
    }).catch(e => {
      t2.fail('rejects instead of passing');
      t2.done();
    });
  })

  t1.done();
});

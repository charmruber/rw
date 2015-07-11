'use strict';

var format = require('./format');

module.exports.run = run;

function run(projectDir, rootDir, task) {

    var cache = format.readAndCheckConfig(projectDir, rootDir);
}

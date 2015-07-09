#!/usr/bin/env node

var log = require('../src/log');
var path = require('path');
var core = require('../src/core');

var node = process.argv[0];
var rw = process.argv[1];
var task = process.argv[2];

log.setLevel(2);

if(!task) {
    task = 'main';
}

var projectDir = path.resolve('.');
var rootDir;

if(process.env.rootDir) {
    rootDir = path.resolve(process.env.rootDir);
}else {
    rootDir = path.resolve(__dirname + '/..');
}

if(!core.run(projectDir, rootDir, task)) {
    console.error('failed -_-!! ');
    process.exit(1);
}
console.log('success ^_^ ~');

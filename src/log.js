'use strict';

module.exports.error = error;
module.exports.info = info;
module.exports.verbose = verbose;
module.exports.setLevel = setLevel;

var level = 3;

function setLevel(_level) {
    level = _level;
}

function error(str) {
    if(level >= 1) {
        console.log(str);
        console.trace();
    }
}

function info(str) {
    if(level >= 2) {
        console.log(str);
    }
}

function verbose(str) {
    if(level >= 3) {
        console.log(str);
    }
}

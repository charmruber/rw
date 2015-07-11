'use strict';

var fs = require('fs');

module.exports.pwd = pwd;
function pwd() {
    return path.resolve('.');
}

module.exports.readbyline = readbyline;
function readbyline(filename, fn, fn2) {
    var liner = new stream.Transform({objectMode: true});
}

module.exports.readJSON = readJSON;
function readJSON(file) {
    if(fs.existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file));
        }catch(e) {
            console.error(file + ' is not a valid JSON file');
            console.error(e.stack);
            return null;
        }
    }
}

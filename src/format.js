'use strict';

var path = require('path');
var log = require('./log');
var fs = require('fs');
var libFile = require('../lib/nodejs/file');

function getDeps(arch, archRoot, cache) {
    if(cache.formats[arch]) {
        return true;
    }
    cache.formats[arch] = {};
    if(!readConfig(archRoot + '/' + arch + '/format', undefined, cache.formats[arch])) {
        log.e('read format json error ' + arch);
        return false;
    }
    if(cache.formats[arch].project) {
        if(!checkKit(cache.config.project, cache.formats[arch].project)) {
            log.error(arch + ' project.json in wrong format');
            return false;
        }
    }
}

module.exports.readAndCheckConfig = readAndCheckConfig;

function readAndCheckConfig(dir, rootDir) {
    var archRoot = path.resolve(rootDir + '/arch');
    var cache = {};
    cache.config = {};
    cache.format = {};
    cache.formats = {};
    log.info('read project.json');
    if(!readConfig(dir, 'project', cache.config)) {
        log.error('read config error');
        return null;
    }
    if(!cache.config.project) {
        cache.config.project = {};
    }
    var arch = cache.config.project.arch || 'base';
    if(!getDeps(arch, archRoot, cache)) {
        log.error('getDeps error');
        return null;
    }
}

function readConfig(dir, labels, cache) {
    if(typeof labels == 'string') {
        var tmp = {};
        tmp[labels] = true;
        labels = tmp;
    }
    var files = fs.readdirSync(dir);
    var ms;
    for(var i = 0; i < files.length; i++) {
        var file = files[i];
        if((ms = file.match(/(\S+)\.json$/))) {
            var label = ms[1];
            if(labels && !labels[label]) { // q
                continue;
            }
            if(cache[label]) {
                continue;
            }
            var json = libFile.readJSON(dir + '/' + file);
            if(!json) {
                log.error('read json ' + dir + '/' + file + ' error');
                return null;
            }
            cache[label] = json;
        }
    }
    return true;
}

module.exports.checkKit = checkKit;
function checkKit(json, fjson, env) {
    if(!json) {
        json = {};
    }
    if(!fjson.kit) {
        log.error('no key "kit" in ' + JSON.stringify(fjson, undefined, 2));
        return false;
    }
    if(fjson.default) {
        for(var name in fjson.default) {
            if(!json[name]) {
                json[name] = fjson.default[name];
            }
        }
    }
    switch (fjson.kit) {
        case 'list':
            for(var name in json) {
                json[name].name = name;
                if(!checkFormat(json[name], fjson.format, env)) {
                    log.error(name + ' wrong format');
                    return false;
                }
            }
            break;
        case 'array':
            if(!libObject.isArray(json)) {
                json = [];
            }
            var abbr = fjson.abbr || 'type';
            for(var i = 0; i < json.length; i++) {
                if(typeof(json[i]) === 'string') {
                    var tmp = {};
                    tmp[abbr] = json[i];
                    json[i] = tmp;
                }
                if(!checkFormat(json[i], fjson.format, env)) {
                    log.error(i + ' wrong format');
                    return false;
                }
                json[i].i = i;
            }
            break;
            case 'mono':
        default:
            if(!checkFormat(json, fjson.format, env)) {
                return false;
            }
    }
    return true;
}

module.exports.checkFormat = checkFormat;
function checkFormat(json, fjson, env) {
    if(!json) {
        log.error('checkFormat wrong params');
        return false;
    }
    for(var key in fjson) {
        var entryFormat = fjson[key];
        if(typeof(entryFormat) == 'string') {
            entryFormat = {type: entryFormat};
        }
    }
}

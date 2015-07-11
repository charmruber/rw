'use strict';

var path = require('path');
var log = require('./log');
var fs = require('fs');
var libFile = require('../lib/nodejs/file');
var libObject = require('../lib/js/object');

module.exports.readAndCheckConfig = readAndCheckConfig;
module.exports.checkKit = checkKit;
module.exports.checkFormat = checkFormat;

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
    libObject.extend(cache.format, cache.formats[arch]);
    if(!cache.config.project.deps) {
        return true;
    }
    var deps = cache.config.project.deps;
    for(var dep in deps) {
        if(!getDeps(dep, archRoot, cache)) {
            log.error('getDeps ' + arch + ' error');
            return false;
        }
    }
    return true;
}

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
        if(!json.hasOwnProperty(key)) {
            if(entryFormat.default) {
                json[key] = entryFormat.default;
            }else if(entryFormat.eq) {
                json[key] = json[entryFormat.eq];
            }else if(entryFormat.required) {
                log.error(key + ' required but not existed');
                return false;
            }else if(entryFormat.type == 'enums') {
                // default all enums
                // processed in the switch
                // done
            }else if(entryFormat.kit == 'array' || entryFormat.type == 'array') {
                // default
                json[key] = [];
            }else if(entryFormat.kit) {
                json[key] = {};
            }else {
                continue;
            }
        }
        if(entryFormat.kit) {
            if(json.hasOwnProperty(key)) {
                if(!checkKit(json[key], entryFormat, env)) {
                    log.error(key + ' is not the format of kit ' + entryFormat.kit);
                    return false;
                }else {
                    continue;
                }
            }else {
                json[key] = [];
            }
        }
        if(!entryFormat.type) {
            log.error(entryFormat);
            log.error(json[key]);
            log.error('Format json error');
            return false;
        }
        switch(entryFormat.type) {
            case 'enums':
                if(typeof(json[key]) == 'string') {
                    json[key] = [json[key]];
                }
                if(entryFormat.sets) {
                    if(json[key]) {
                        for(var i = 0; i < json[key].length; i++) {
                            if(libArray.indexOf(entryFormat.sets, json[key][i]) == -1) {
                                log.error(key + ':' + json[key][i] + ' is not in ' + entryFormat.sets.join(', '));
                                return false;
                            }
                        }
                    }else {
                        json[key] = entryFormat.sets;
                    }
                }else if(entryFormat.from) {
                    if(!env) {
                        log.error('project.json not support enums type');
                        return false;
                    }
                    var list = libObject.getByKey(env, entryFormat.from);
                    if(!list) {
                        log.error('no ' + entryFormat.from + ' in ');
                        log.error(env);
                        json[key] = [];
                        return true;
                    }
                    if(json[key]) {
                        for(var i = 0; i < json[key].length; i++) {
                            if(!list[json[key][i]]) {
                                log.error(key + ':' + json[key][i] + ' is not in ' + Object.keys(list).join(', '));
                                return false;
                            }
                        }
                    }else {
                        json[key] = Object.keys(list);
                    }json[key].from = entryFormat.from;
                }
                break;
            case 'enum':
                if(entryFormat.sets) {
                    if(libArray.indexOf(entryFormat.sets, json[key]) == -1) {
                        log.error(key + ':' + json[key] + 'is not in ' + entryFormat.sets.join(', '));
                        return false;
                    }
                }else if(entryFormat.from) {
                    if(!env) {
                        log.error('project.json not support enum type');
                        return false;
                    }
                    var list = libObject.getByKey(env, entryFormat.from);
                    if(!list) {
                        log.error('no ' + entryFormat.from + ' in ');
                        log.error(env);
                        return false;
                    }
                    if(!list[json[key]]) {
                        log.error(key + ':' + json[key] + ' is not in ' + Object.keys(list).join(', '));
                        return false;
                    }
                }
                break;
            case 'array':
                if(!libObject.isArray(json[key])) {
                    log.error(JSON.stringify(json, undefined, 2) + key + ' is not array');
                    return false;
                }
                break;
            case 'list':
                break;
            case 'number':
                if(typeof(json[key]) != 'number') {
                    log.error(JSON.stringify(json, undefined, 2) + key + 'is not number');
                    return false;
                }
                break;
            case 'string':
            default:
                if(typeof(json[key]) != 'string') {
                    log.error(JSON.stringify(json, undefined, 2) + key + 'is not string');
                    return false;
                }

        }
    }
    return true;
}

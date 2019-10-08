const fs = require('fs');
const path = require('path');
const utils = require('../util/utils');
const crypto = require('crypto');
const uitl = require('util');

module.exports = function (app, opts) {
    return new Component(app, opts);
};

const Component = function (app, opts) {
    this.app = app;
    this.dict = {};
    this.abbrs = {};
    this.userDicPath = null;
    this.routeGroups = null;

    //Set user dictionary
    var p = path.join(app.getBase(), '/config/dictionary.json');
    if (opts && opts.dict) {
        p = opts.dict;
    }
    if (fs.existsSync(p)) {
        this.userDicPath = p;
    } else {
        throw new Error('dictionary.json not found.');
    }
};

const pro = Component.prototype;

pro.name = '__dictionary__';

pro.start = function (cb) {
    this.routeGroups = require(this.userDicPath);
    for (var g in this.routeGroups) {
        if (!this.routeGroups.hasOwnProperty(g)) {
            continue;
        }
        const group = this.routeGroups[g];
        group.ver = crypto.createHash('md5').update(JSON.stringify(group)).digest('base64');
        for (var i = 0; i < group.dict.length; i++) {
            const idx = group.idx + i;
            if (this.abbrs[idx]) {
                const error = util.format('route idx conflict. [%s] in group[%s] with [%s]'
                    , group.dict[i]
                    , g
                    , this.abbrs[idx]
                );
                throw new Error(error);
            }
            if (this.dict[group.dict[i]]) {
                const error = util.format('route[%s] duplicated.'
                    , group.dict[i]
                );
                throw new Error(error);
            }
            this.abbrs[idx] = group.dict[i];
            this.dict[group.dict[i]] = idx;
        }// end for (var j = 0; j < group.dict.length; j++) {
    }// end for (var g in this.routeGroups) {

    utils.invokeCallback(cb);
};

pro.getDict = function () {
    return this.dict;
};

pro.getAbbrs = function () {
    return this.abbrs;
};

pro.getRouteGroups = function () {
    return this.routeGroups;
};

const pomelo = require('../../pomelo');
const Package = require('pomelo-protocol').Package;
const logger = require('pomelo-logger').getLogger('pomelo', __filename);

const CODE_OK = 200;
const CODE_USE_ERROR = 500;
const CODE_OLD_CLIENT = 501;

/**
 * Process the handshake request.
 *
 * @param {Object} opts option parameters
 *                      opts.handshake(msg, cb(err, resp)) handshake callback. msg is the handshake message from client.
 *                      opts.hearbeat heartbeat interval (level?)
 *                      opts.version required client level
 */
const Command = function (opts) {
    opts = opts || {};
    this.userHandshake = opts.handshake;

    if (opts.heartbeat) {
        this.heartbeatSec = opts.heartbeat;
        this.heartbeat = opts.heartbeat * 1000;
    }

    this.checkClient = opts.checkClient;

    this.useDict = opts.useDict;
    this.useProtobuf = opts.useProtobuf;
    this.useCrypto = opts.useCrypto;
};

module.exports = Command;

Command.prototype.handle = function (socket, msg) {
    if (!msg.sys) {
        processError(socket, CODE_USE_ERROR);
        return;
    }

    if (typeof this.checkClient === 'function') {
        if (!msg || !msg.sys || !this.checkClient(msg.sys.type, msg.sys.version)) {
            processError(socket, CODE_OLD_CLIENT);
            return;
        }
    }

    if (this.useDict) {
        // 校验路由组信息
        if (!msg.sys || !msg.sys.routes) {
            // 客户端没有路由组
            processError(socket, CODE_OLD_CLIENT);
            return;
        }

        const routes = pomelo.app.components.__dictionary__.getRouteGroups();
        var exist = false;
        for (var g in msg.sys.routes) {
            if (!msg.sys.routes.hasOwnProperty(g)) {
                continue;
            }

            if (!routes[g]) {
                if (pomelo.app.get('env') === 'development') {
                    logger.error("==============服务器不存在的路由组[%s] ==============", g);
                }
                processError(socket, CODE_OLD_CLIENT);
                return;
            }// end if (!routes[g]) {
            if (routes[g].ver !== msg.sys.routes[g].ver) {
                if (pomelo.app.get('env') === 'development') {
                    logger.error("==============路由组[%s]版本不匹配 ==============%j==============", g, routes[g]);
                }
                processError(socket, CODE_OLD_CLIENT);
                return;
            }
            exist = true;
        }// end for (var g in msg.sys.routes) {
        if (!exist) {
            if (pomelo.app.get('env') === 'development') {
                logger.error("==============客户端传递了空路由组 ==============%j==============", msg);
            }
            processError(socket, CODE_OLD_CLIENT);
            return;
        }
    }// end if(this.useDict) {

    if (pomelo.app.components.__decodeIO__protobuf__) {
        // 校验协议组信息
        if (!msg.sys || !msg.sys.protos) {
            // 客户端没有协议组
            processError(socket, CODE_OLD_CLIENT);
            return;
        }

        const protos = pomelo.app.components.__decodeIO__protobuf__.getProtos();
        var exist = false;
        for (var g in msg.sys.protos) {
            if (!msg.sys.protos.hasOwnProperty(g)) {
                continue;
            }

            if (!protos[g]) {
                if (pomelo.app.get('env') === 'development') {
                    logger.error("==============服务器不存在的协议组[%s] ==============", g);
                }
                processError(socket, CODE_OLD_CLIENT);
                return;
            }// end if (!protos[g]) {
            if (protos[g].ver !== msg.sys.protos[g].ver) {
                if (pomelo.app.get('env') === 'development') {
                    logger.error("==============协议组[%s]版本不匹配 ==============%j==============", g, protos[g]);
                }
                processError(socket, CODE_OLD_CLIENT);
                return;
            }
            exist = true;
        }// end for (var g in msg.sys.protos) {
        if (!exist) {
            if (pomelo.app.get('env') === 'development') {
                logger.error("==============客户端传递了空协议组 ==============%j==============", msg);
            }
            processError(socket, CODE_OLD_CLIENT);
            return;
        }
    }// end if (pomelo.app.components.__decodeIO__protobuf__) {

    const opts = {
        heartbeat: this.heartbeatSec
    };

    if (this.useCrypto) {
        pomelo.app.components.__connector__.setPubKey(socket.id, msg.sys.rsa);
    }

    if (typeof this.userHandshake === 'function') {
        msg.ip = socket.remoteAddress.ip;
        this.userHandshake(msg, function (err, resp) {
            if (err) {
                process.nextTick(function () {
                    processError(socket, CODE_USE_ERROR);
                });
                return;
            }
            process.nextTick(function () {
                response(socket, opts, resp);
            });
        }, socket);
        return;
    }

    process.nextTick(function () {
        response(socket, opts);
    });
};

const response = function (socket, sys, resp) {
    const res = {
        code: CODE_OK,
        sys: sys
    };
    if (resp) {
        res.user = resp;
    }

    const buffer = new Buffer(JSON.stringify(res))
    const package = Package.encode(Package.TYPE_HANDSHAKE, buffer);
    //console.log("========握手协议包长度[%s], 原始消息:%j", package.length, res);
    socket.handshakeResponse(package);
};

const processError = function (socket, code) {
    const res = {
        code: code
    };
    socket.sendForce(Package.encode(Package.TYPE_HANDSHAKE, new Buffer(JSON.stringify(res))));
    process.nextTick(function () {
        socket.disconnect();
    });
};

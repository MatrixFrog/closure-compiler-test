/**
 * @fileoverview This file provides the standard WebRTC API on supported browsers.
 */

goog.provide('webrtc');

var webrtc = {};

/** @type {string} */
webrtc.browser = 'unknown';
/** @type {number} */
webrtc.browserVersion = -1;
/** @type {number} */
webrtc.minBrowserVersion = 0;

/**
 * @param {!string} ua
 * @param {!RegExp} re
 * @param {!number} grp
 */
webrtc.extractVersion = function (ua, re, grp) {
    var match = ua.match(re);
    return match && match.length > grp && parseInt(match[grp], 10);
}

if (window.mozRTCPeerConnection) {
    console.log('This appears to be Firefox');
    webrtc.browser = 'firefox';
    webrtc.browserVersion = webrtc.extractVersion(navigator.userAgent, /Firefox\/([0-9]+)\./, 1);
    webrtc.minBrowserVersion = 31;

    if (!window.RTCPeerConnection) {
        window.RTCPeerConnection = function(pcConfig, pcConstraints) {
            if (webrtc.browserVersion < 38) {
                // .urls is not supported in FF < 38.
                // create RTCIceServers with a single url.
                if (pcConfig && pcConfig.iceServers) {
                    var newIceServers = [];
                    for (var i = 0; i < pcConfig.iceServers.length; i++) {
                        var server = pcConfig.iceServers[i];
                        if (server.hasOwnProperty('urls')) {
                            var urls = server['urls'];
                            for (var j = 0; j < urls.length; j++) {
                                var newServer = {
                                    url: urls[j]
                                };
                                if (urls[j].indexOf('turn') === 0) {
                                    newServer.username = server.username;
                                    newServer.credential = server.credential;
                                }
                                newIceServers.push(newServer);
                            }
                        } else {
                            newIceServers.push(pcConfig.iceServers[i]);
                        }
                    }
                    pcConfig.iceServers = newIceServers;
                }
            }
            return new mozRTCPeerConnection(
                pcConfig, /** @type {!MediaConstraints} */(pcConstraints));
        };
        window.RTCPeerConnection.prototype = mozRTCPeerConnection.prototype;
        window.RTCSessionDescription = mozRTCSessionDescription;
        window.RTCIceCandidate = mozRTCIceCandidate;
    }
} else if (window.webkitRTCPeerConnection) {
    console.log('This appears to be Chrome');
    webrtc.browser = 'chrome';
    webrtc.browserVersion = webrtc.extractVersion(
        navigator.userAgent, /Chrom(e|ium)\/([0-9]+)\./, 2);
    webrtc.minBrowserVersion = 38;

    window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        var pc = new webkitRTCPeerConnection(
            pcConfig, /** @type {!MediaConstraints} */(pcConstraints));
        var origGetStats = pc.getStats.bind(pc);
        /**
         * @suppress {checkTypes}
         */
        pc.getStats = function(selector, successCallback, errorCallback) {
            var self = this;
            var args = arguments;

            // If selector is a function then we are in the old style stats so just
            // pass back the original getStats format to avoid breaking old users.
            if (arguments.length > 0 && typeof selector === 'function') {
                return origGetStats(selector, successCallback);
            }

            var fixChromeStats_ = function(response) {
                var standardReport = {};
                var reports = response.result();
                reports.forEach(function(report) {
                    var standardStats = {
                        id: report.id,
                        timestamp: report.timestamp,
                        type: report.type
                    };
                    report.names().forEach(function(name) {
                        standardStats[name] = report.stat(name);
                    });
                    standardReport[standardStats.id] = standardStats;
                });

                return standardReport;
            };

            if (arguments.length >= 2) {
                var successCallbackWrapper_ = function(response) {
                    args[1](fixChromeStats_(response));
                };
                return origGetStats.apply(this, [successCallbackWrapper_, arguments[0]]);
            }

            // promise-support
            return new Promise(function(resolve, reject) {
                if (args.length === 1 && typeof selector === 'object') {
                    origGetStats.apply(
                        self, [function(response) {
                            resolve.apply(null, [fixChromeStats_(response)]);
                        }, reject]);
                } else {
                    origGetStats.apply(self, [resolve, reject]);
                }
            });
        };
        return pc;
    };
    window.RTCPeerConnection.prototype = webkitRTCPeerConnection.prototype;

    // add promise support
    ['createOffer', 'createAnswer'].forEach(function(method) {
        var nativeMethod = webkitRTCPeerConnection.prototype[method];
        webkitRTCPeerConnection.prototype[method] = function() {
            var self = this;
            if (arguments.length < 1 ||
                (arguments.length === 1 && typeof(arguments[0]) === 'object')) {
                var opts = arguments.length === 1 ? arguments[0] : undefined;
                return new Promise(function(resolve, reject) {
                    nativeMethod.apply(self, [resolve, reject, opts]);
                });
            } else {
                return nativeMethod.apply(this, arguments);
            }
        };
    });

    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function(method) {
        var nativeMethod = webkitRTCPeerConnection.prototype[method];
        webkitRTCPeerConnection.prototype[method] = function() {
            var args = arguments;
            var self = this;
            return new Promise(function(resolve, reject) {
                nativeMethod.apply(self, [args[0], function() {
                    resolve();
                    if (args.length >= 2) {
                        args[1].apply(null, []);
                    }
                },
                function(err) {
                    reject(err);
                    if (args.length >= 3) {
                        args[2].apply(null, [err]);
                    }
                }]);
            });
        };
    });
} else if (navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
    webrtc.browser = 'edge';
    webrtc.browserVersion = webrtc.extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2);
    webrtc.minBrowserVersion = 10547;
    // TODO: Complete this!
} else {
    console.log('Browser does not appear to be WebRTC-capable.');
}

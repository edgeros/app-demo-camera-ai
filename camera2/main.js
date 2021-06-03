/*
 * Copyright (c) 2021 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: main.js camera demo application.
 *
 * Author: Cheng.yongbin
 *
 */

var WebApp = require('webapp');
var WebMedia = require('webmedia');
var onvif = require('@edgeros/jsre-onvif');
const {Manager} = require('@edgeros/jsre-medias');
if (true) {
	var CameraSource = require('./camera_src');
} else {
	var CameraSource = require('./camera_src2');
}

/* Register media source. */
const sourceName = 'camera-flv';
WebMedia.registerSource(sourceName, CameraSource);

/* WebApp. */
var app = WebApp.createApp();

/* Set static path. */
app.use(WebApp.static('./public'));

/* Media manage server. */
var server = undefined;

/* Is server starting. */
var starting = false;

/*
 * Create Media server.
 */
function createMediaSer() {
	console.log('Create media server.');
	if (server) {
		return server;
	}
	
	var opts = {
		mediaTimeout: 1800000,
		searchCycle: 20000,
		autoGetCamera: false
	};
	server = new Manager(app, null, opts, (opts) => {
		return {
			source: sourceName,
			inOpts: opts,
			outOpts: null
		}
	});
	server.on('open', (media) => {
		console.log('Media open.')
		media.on('open', (media, client) => console.log('Media client open.'));
		media.on('close', (media, client) => console.log('Media client close.'));
	});

  return server;
}

/*
 * Start Meia server.
 */
function startServer() {
	if (server) {
		return true;
	}
	try {
		createMediaSer();
		starting = true;
		console.log('Start server success.');
		return true;
	} catch (err) {
		starting = false;
		console.warn('Start server fail:', err.message);
		return false;
	}
}

/*
 * Connect media source.
 */
function connectMedia(info, cb) {
	var devId = info.devId;
	var dev = server.findDev(devId);
	if (!dev) {
		var err = new Error('Device invalid.');
		err.code = 'invalid';
		return cb(err);
	}

	var cam = undefined;
	new Promise((resolve, reject) => {
		dev.username = info.username;
		dev.password = info.password;
		cam = new onvif.Cam(dev);
		cam.on('connect', (err) => {
			if (err) {
				console.warn(`Camera(${cam.urn}) connection fail:`, err);
				return reject(err);
			}
			cam.getStreamUri({protocol:'RTSP'}, (err, stream) => {
				if (err) {
					console.warn(`Camera(${cam.urn}) get uri fail:`, err);
					reject(err);
				} else {
					console.info(`Camera(${cam.urn}) get uri:`, stream.uri);
					resolve(stream.uri);
				}
			});
		});
	})
	.then((uri) => {
		var media = server.findMedia(devId);
		if (media) { /* Media already conect. */
			return cb(media);
		}

		var urlParts = server.getCamUrl(uri);
		var parts = {
			user: urlParts.user || cam.username,
			pass: urlParts.pass || cam.password,
			hostname: urlParts.hostname,
			port: urlParts.port || 554,
			path: urlParts.path || '/'
		}
		return server.createMedia(devId, parts, cam, (media) => {
			if (media instanceof Error) {
				cb();
			} else {
				server.removeDev(devId);
				cb(media);
			}
		});
	})
	.catch((err) => {
		cb(err);
	});
}

/* 
 * res: [{devId, alias, report, status}...]
 */
app.get('/api/list', (req, res) => {
	if (!server) {
		var ret = startServer();
		if (!ret) {
			return res.json([]);
		}
	}

	var devs = {};
	server.iterDev((key, dev) => {
		devs[key] = {
			devId: key,
			alias: `${dev.hostname}:${dev.port}${dev.path}`,
			report: dev.urn,
			path: '',
			status: false
		}
	});
	server.iterMedia((key, media) => {
		devs[key] = {
			devId: media.key,
			alias: media.alias,
			report: media.sid,
			path: '/' + media.sid,
			status: true
		}
	});

	var infos = [];
	for (var key in devs) {
		infos.push(devs[key]);
	}
	res.send(JSON.stringify(infos));
});

/*
 * req: {devId, username, password}
 * res: {result, msg, path}
 */
app.post('/api/login', (req, res) => {
	console.log('Recv camera-login message.');
	if (!server) {
		return res.json({
			result: false,
			msg: 'Media not start.'
		});
	}

	var ret = {result: false, msg: 'error'};
	var data = [];
	req.on('data', (buf) => {
		data.push(buf);
	});

	req.on('end', () => {
		try {
			data = Buffer.concat(data);
			var info = JSON.parse(data.toString());
			console.log('login data:', info);

			connectMedia(info, (media) => {
				if (!media || media instanceof Error) {
					ret.msg = `Device ${info.devId} login fail.`;
					console.warn(media ? media.message : ret.msg);
				} else {
					ret.result = true;
					ret.msg = 'ok';
					ret.path = '/' + media.sid;
				}
				res.send(JSON.stringify(ret));
			});

		} catch(e) {
			ret.result = false;
			ret.msg = e.message;
			console.warn(ret.msg);
			res.send(JSON.stringify(ret));
			return;
		}
	});
});

/* app start */
app.start();

/* Start media server. */
Task.nextTick(startServer);

/* Event loop */
require('iosched').forever();

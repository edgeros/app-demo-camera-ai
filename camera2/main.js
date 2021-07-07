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

/* Import system modules */
const WebApp = require('webapp');
const WebMedia = require('webmedia');
const bodyParser = require('middleware').bodyParser;
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

	 var stream = dev.mainStream;
	if (!stream) {
		server.createStream(devId, info, (err, streams) => {
			if (err) {
				cb(err);
			} else {
				getMedia(cb);
			}
		});
	} else if (stream.media) {
		cb(stream.media);
	} else {
		getMedia(cb);
	}

	function getMedia(cb) {
		var stream = dev.mainStream;
		if (!stream) {
			return cb();
		} else if (stream.media) {
			return cb(stream.media);
		}
		server.createMedia(devId, stream.token, info, (err, media) => {
			if (err) {
				cb(err);
			} else {
				cb(media);
			}
		});
	}
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

	var devs = [];
	server.iterDev((key, dev) => {
		var info = dev.dev;
		var stream = dev.mainStream;
		var media = stream ? stream.media : null;
		devs.push({
			devId: key,
			alias: `${info.hostname}:${info.port}${info.path}`,
			report: info.urn,
			path: media ? '/' + media.sid : '',
			status: media ? true: false
		});
	});
	res.send(JSON.stringify(devs));
});

/*
 * req: {devId, username, password}
 * res: {result, msg, path}
 */
app.post('/api/login', bodyParser.json(), (req, res) => {
	console.log('Recv camera-login message.');
	if (!server) {
		return res.json({
			result: false,
			msg: 'Media not start.'
		});
	}

	var ret = {result: false, msg: 'error'};
	var info = req.body;
	try {
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

/* Start App */
app.start();

/* Start media server. */
Task.nextTick(startServer);

/* Event loop */
require('iosched').forever();

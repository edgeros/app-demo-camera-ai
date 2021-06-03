/*
 * Copyright (c) 2019 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: camera_src2.js camera source module.
 *
 * Author: Cheng.yongbin
 *
 */

var MediaDecoder = require('mediadecoder');
var facenn = require('facenn');
var FlvSrc = require('webmedia/source/flv');
var util = require('util');
var Sigslot = require('sigslot');

var extend = util.extend;
var clone = util.clone;

/* Pixel format. */
const MEDIA_PIXEL_FORMAT = MediaDecoder.PIX_FMT_RGB24;
const FACENN_PIXEL_FORMAT = facenn.PIX_FMT_RGB24;

/* Default input options. */
const DEF_IN_OPTS = {
	protocol: 'tcp',
	host: null,
	port: 554,
	path: '/',
	user: 'admin',
	pass: 'admin',
}

/* Default face detec view setting. */
const DEF_DETEC_VIEW = {
	disable: false,
	width: 640,
	height: 320,
	fps: 1,
	noDrop: false,
	pixelFormat: MEDIA_PIXEL_FORMAT,
}

/*
 * CameraSource.
 * op: start, stop.
 * emit: start, stop, stream, data, end, error.
 * Data protocol:
 * 	media: Push media info data first.
 *  	opts: {type: 'media'}
 * 		data: {width: {Integer}, height: {Integer}, fps: {Integer}}
 * 	face: Face detec output info.
 * 		opts: {type: 'face'}
 * 		data: [{x0: {Integer}, y0: {Integer}, x1: {Integer}, y1: {Integer}}, ...]
 */
class CameraSource extends FlvSrc {
	/* 
	 * constructor(ser, mode, inOpts[, outOpts])
	 * inOpts:
	 * 	host {String}
	 * 	[port] {Integer} Default: 10000
	 * 	[path] {String} Default: '/'
	 * 	[user] {String} Default: 'admin'
	 * 	[pass] {String} Default: 'admin'
	 */
	constructor(ser, mode, inOpts, outOpts) {
		super(ser, mode, inOpts, outOpts);

		if (typeof inOpts !== 'object') {
			throw new TypeError('Argument error.');
		}
		var input = clone(DEF_IN_OPTS);
		extend(input, inOpts);
		if (!input.host) {
			throw new TypeError('Argument inOpts.host error.');
		}

		this.inOpts = input;
		this._netcam = null;
		this.mediaInfo = { width: 0, height: 0, fps: 0 }; /* Origin media size. */

		this.name = `${input.host}:${input.port}${input.path}`;
		this.aiTask = null;
		this.aiSlot = new Sigslot(this.name);
		var self = this;
		this.aiSlot.slot('error', (type, msg) => {
			console.error('AI task err, ai to be close:', msg);
			self.aiTask.cancel();
			self.aiTask = null;
		}, 'error');
		this.aiSlot.slot('face', (type, msg) => {
			self.onVideo(msg);
		}, 'face');
	}

	start() {
		var netcam = new MediaDecoder();
		this._netcam = netcam;
		var self = this;
		var input = this.inOpts;
		var url = `rtsp://${input.user}:${input.pass}@${input.host}:${input.port}${input.path}`;

		new Promise((resolve, reject) => {
			netcam.open(url, { proto: 'tcp', name: self.name }, 10000, (err) => {
				if (err) {
					console.error('Open netcam fail:', url, err);
					reject(err);
				} else {
					netcam.destVideoFormat(DEF_DETEC_VIEW);
					netcam.destAudioFormat({ disable: true });
					netcam.remuxFormat({ enable: true, enableAudio: true, format: 'flv' });
	
					netcam.on('remux', self.onStream.bind(self));
					netcam.on('header', self.onStream.bind(self));
					netcam.on('eof', self.onEnd.bind(self));
					resolve(netcam);
				}
			});
		})
		.then((netcam) => {
			super.start.call(self);
			netcam.start();
			var info = self._netcam.srcVideoFormat();
			self.mediaInfo = { width: info.width, height: info.height, fps: Math.round(info.fps) };
			self.sendDataHeader({ type: 'media' }, self.mediaInfo); /* {width, height, fps} */
		
			self.aiTask = new Task('./src_ai.js', {
				magic: 'tasks-face-flv',
				name: self.name,
			}, {
				directory: module.directory
			});
		})
		.catch((err) => {
			console.error('Open netcam fail:', url, err);
			this.end();
		});
	}

	/*
	 * stop()
	 */
	stop() {
		console.info('Src stop');
		if (this._netcam) {
			this._netcam.close();
			this._netcam = null;
		}
		if (this.aiTask) {
			this.aiSlot.emit('stop');
			this.aiTask = null;
		}
		if (this.aiSlot) {
			this.aiSlot.off();
			this.aiSlot = null;
		}

		Task.nextTick(() => {
			super.stop.call(this);
		})
	}

	/*
	 * onVideo(infos)
	 * Face detec output info: [{x0, y0, x1, y1}]
	 */
	onVideo(infos) {
		const view = DEF_DETEC_VIEW;
		for (var i = 0; i < infos.length; i++) {
			var info = infos[i];
			info.x0 = Math.round(info.x0 * this.mediaInfo.width / view.width);
			info.x1 = Math.round(info.x1 * this.mediaInfo.width / view.width);
			info.y0 = Math.round(info.y0 * this.mediaInfo.height / view.height);
			info.y1 = Math.round(info.y1 * this.mediaInfo.height / view.height);
		}

		var cliMgr = this.getCliMgr();
		cliMgr.iter(function(cli) {
			cli.sendData({type: 'face'}, infos);
		});
	}

	/*
	 * onStream(frame)
	 */
	onStream(frame) {
		if (!this._netcam) {
			return;
		}
		var buf = Buffer.from(frame.arrayBuffer);
		try {
			this.pushStream(buf);
		} catch (e) {
			console.error(e);
			this.stop();
		}
	}

	/*
	 * onEnd()
	 */
	onEnd() {
		console.info('Src end');
		this.end();
	}
}

/*
 * Export module.
 */
module.exports = CameraSource;


/*
 * Copyright (c) 2021 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: src_ai.js face-flv source ai module.
 *
 * Author: Cheng.yongbin
 *
 */

var facenn = require('facenn');
var MediaDecoder = require('mediadecoder');
var Sigslot = require('sigslot');
var iosched = require('iosched');

/* Pixel format. */
const MEDIA_PIXEL_FORMAT = MediaDecoder.PIX_FMT_RGB24;
const FACENN_PIXEL_FORMAT = facenn.PIX_FMT_RGB24;

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
 * SrcAI.
 * src <-> ai msg:
 * 	src <- [error]  -- ai
 * 	src <- [face]   -- ai
 */
class SrcAI {
	/*
	 *  name {String}
	 */
	constructor(name) {
		console.info('Create src ai');
		this.running = true;
		this.main = name;
		this.netcam = null;

		var self = this;
		var slot = new Sigslot(name);
		this.slot = slot;
		slot.slot('stop', (type, msg) => {
			Task.nextTick(self.stop.bind(self));
		}, 'stop');
		this.start();
	}

	/*
	 * start() 
	 */
	start() {
		console.info('Src ai start:', this.main);
		try {
			this.netcam = new MediaDecoder().open(this.main);
			this.netcam.destVideoFormat({disable: false});
			this.netcam.on('video', this.onVideo.bind(this));
			this.netcam.start();
		} catch(e) {
			this.slot.emit('error', e.message);
			Task.nextTick(this.stop.bind(this));
		}
	}

	/*
	 * stop()
	 */
	stop() {
		console.info('Src ai stop');
		if (this.netcam) {
			this.netcam.close();
			this.netcam = null;
		}
		if (this.slot) {
			this.slot.off();
			this.slot = null;
		}
		this.running = false;
	}

	/*
	 * onVideo(frame)
	 * Face detec output info: [{x0, y0, x1, y1}]
	 */
	onVideo(frame) {
		var buf = new Buffer(frame.arrayBuffer);
		const view = DEF_DETEC_VIEW;
		var faceInfo = facenn.detect(buf, { width: view.width, height: view.height, pixelFormat: FACENN_PIXEL_FORMAT });
		var ret = []; /* Empty array - clear. */

		for (var i = 0; i < faceInfo.length; i++) {
			var info = {};
			info.x0 = Math.max(faceInfo[i].x0 - 10, 0);
			info.x1 = Math.min(faceInfo[i].x1 + 10, view.width - 1);
			info.y0 = Math.max(faceInfo[i].y0 - 10, 0);
			info.y1 = Math.min(faceInfo[i].y1, view.height - 1);
			ret.push(info);
		}

		/* sigslot send to src. */
		if (this.slot) {
			this.slot.emit('face', ret);
		}
	}
}

/*
 * ARGUMENT:
 *  magic {String} 'tasks-face-flv'
 *  name {String}
 * 	faceDetecOpts {Object}
 */
if (ARGUMENT && typeof ARGUMENT === 'object' && ARGUMENT.magic && ARGUMENT.magic === 'tasks-face-flv') {
	var name = ARGUMENT.name;
	var srcAI = new SrcAI(name);
	while (srcAI.running) {
		iosched.poll();
	}
	console.info('Src ai exit.');
} else {
	console.warn('Invalid task, exit.');
}

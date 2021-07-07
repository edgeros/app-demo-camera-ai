/*
 * Copyright (c) 2019 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: mediawrap.js media client wrap module.
 *
 * Author: Cheng.yongbin
 *
 */

/*
 * createMediaClient(ClientType, origin, canvas, opts, shakeHandle)
 */
export default function createMediaClient(ClientType, origin, canvas, opts, shakeHandle) {
	class ClientWrap extends ClientType {
		/*
		 * constructor(origin, canvas, opts, shakeHandle)
		 * opts:
		 *  path {String}
		 * 	canvaw {Number}
		 * 	canvah {Number}
		 * shakeHandle {Function}
		 *  self {MediaClient}
		 *  id {Number}
		 */
		constructor(origin, canvas, opts, shakeHandle) {
			super(origin, shakeHandle, opts);
	
			this.canvas = canvas;
			this.ctx = this.canvas.getContext("2d");
			this.canvaw = opts.canvaw;
			this.canvah = opts.canvah;
			this.videow = 1280;
			this.videoh = 720;
			this.rw = this.canvaw / this.videow;
			this.rh = this.canvah / this.videoh;
	
			this.ctx.clearRect(0, 0, this.canvaw, this.canvah);
			this.on('data', this.onData.bind(this));
		}
	
		/*
		 * _uninit
		 */
		_uninit() {
			this.canvas = null;
			this.ctx = null;
			super._uninit();
		}
	
		/*
		 * draw(layouts)
		 */
		draw(layouts) {
			if (!Array.isArray(layouts)) {
				return;
			}
			this.ctx.clearRect(0, 0, this.canvaw, this.canvah);
			var count = layouts.length;
			var ctx = this.ctx;
			for (var i = 0; i < count; i++) {
				var layout = layouts[i];
				var x0 = layout.x0 * this.rw;
				var y0 = layout.y0 * this.rh;
				var w = (layout.x1 - layout.x0) * this.rw;
				var h = (layout.y1 - layout.y0) * this.rh;
				ctx.strokeStyle = '#00FF00';
				ctx.strokeRect(x0, y0, w, h);
			}
		}
	
		/*
		 * onData(self, opts, data)
		 */
		onData(self, opts, data) {
			var type = opts && opts.type ? opts.type : null;
			if (type === 'media') {
				console.log('media info:' + data);
				this.videow = data.width;
				this.videoh = data.height;
				this.rw = this.canvaw / this.videow;
				this.rh = this.canvah / this.videoh;
			} else if (type === 'face') {
				this.draw(data);
	
			} else {
				console.error('Data invalid.');
			}
		}
	}
	return new ClientWrap(origin, canvas, opts, shakeHandle);
}

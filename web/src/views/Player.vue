<template>
  <div class="about">
    <div class="canvas-wrapper" :style="{position:'relative', width: width + 'px', height: height + 'px'}">
      <canvas id="video" :style="{position:'absolute', width: width + 'px', height: height + 'px'}"/>
      <canvas id="layout" :style="{position:'absolute'}" :width="width" :height="height"/>
    </div>
    <div class="menu">
      <van-button v-on:click="startPlay()">播放</van-button>
      <van-button v-on:click="stopPlay()">停止</van-button>
    </div>
  </div>
</template>

<script>
import { getAuth } from '@/lib/auth';
import createMediaClient from '@/lib/mediaclient';

export default {
  name: 'Player',
  props: ['dev'],
  data() {
    return {
      isStarting: false,
      width: 360,
      height: 202,
    };
  },
  methods: {
    startPlay: function () {
      console.log('Start play.');
      if (!this.isStarting) {
        console.log('Start.');
        this.isStarting = true;
        this.mediaClient.open(getAuth());
      }
    },
    stopPlay: function() {
      if (this.isStarting) {
        console.log('Stop.');
        this.mediaClient.close();
      }
    },
    getPageSize: function () {
      let page = {
        width: 0,
        height: 0,
      };
      if (window.innerWidth && window.innerHeight) {
        page.width = window.innerWidth;
        page.height = window.innerHeight;
      } else if (
        document.body &&
        document.body.clientWidth &&
        document.body.clientHeight
      ) {
        page.width = document.body.clientWidth;
        page.height = document.body.clientHeight;
      } else if (
        document.documentElement &&
        document.documentElement.clientHeight &&
        document.documentElement.clientWidth
      ) {
        page.width = document.documentElement.clientWidth;
        page.height = document.documentElement.clientHeight;
      }
      var w = page.width;
      var h = parseInt((page.width * 9) / 16);
      this.width = w;
      this.height = h;
      return {w, h};
    },
  },
  mounted() {
    const {w, h} = this.getPageSize();
    this.np = new NodePlayer();
    this.np.setBufferTime(512);
    this.np.setView("video");
    this.np.on("stats", (s) => {
      console.log(s);
    });

    console.log('Create media client.');
    var canvas = document.getElementById('layout');
    var proto = location.protocol === 'http:' ? 'ws:' : 'wss:';
    var host = `${proto}//${window.location.host}`;
    var mediaClient = createMediaClient(MediaClient, host, canvas, {
        canvaw: w,
        canvah: h,
        path: this.dev.path
    }, (client, path) => {
      this.np.start(host + path);
    });
    this.mediaClient = mediaClient;

    mediaClient.on('open', () => {
      console.log('MediaClient on open');
    });

    mediaClient.on('close', () => {
      console.log('MediaClient on close');
      this.np.stop();
      this.isStarting = false;
    });
  },
  destroyed() {
    this.stopPlay();
  },
};
</script>

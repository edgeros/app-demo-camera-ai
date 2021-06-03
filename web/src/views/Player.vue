<template>
  <div class="about">
    <div class="canvas-wrapper">
      <canvas id="video" class="canvas" width="360px" height="202px" />
      <canvas id="layout" class="canvas" width="360px" height="202px" />
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
      isStarting: false
    }
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
    }
  },
  mounted() {
    this.np = new NodePlayer();
    this.np.setBufferTime(512);
    this.np.setView("video");
    this.np.on("stats",(s)=>{
      console.log(s);
    });

    console.log('Create media client.');
    var canvas = document.getElementById('layout');
    var proto = location.protocol === 'http:' ? 'ws:' : 'wss:';
    var host = `${proto}//${window.location.host}`;
    console.log('----TEST: canvas:', typeof canvas, canvas);
    var mediaClient = createMediaClient(MediaClient, host, canvas, {
        canvaw: 360, 
        canvah: 202,
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
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.menu{
  position: absolute;
}
#video {
  top: 0;
  left: 0;
}
#layout {
  top: 0;
  left: 0;
}
.canvas {
  position: absolute;
  width: 360px;
  height: 202px;
}
.canvas-wrapper {
  position: relative;
  width: 360px;
  height: 202px;
}

</style>

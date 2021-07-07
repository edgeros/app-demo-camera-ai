<template>
  <div class="home">
    <van-nav-bar title="设备列表" />
    <van-list>
        <van-cell
          v-for="(dev, index) of devs"
          :title="dev.alias"
          :label="dev.devId"
          :icon="require('../assets/img/camera.png')"
          :key="index"
          is-link="true"
          center="false"
          value-class="cell-value"
          @click="loginDev(dev)"
        >
        </van-cell>
      </van-list>
      <input-dialog :show="show" :dev="curDev" @close="onDialog">
      </input-dialog>
  </div>
</template>

<script>
import axios from "axios";
import { getHeaders } from "@/lib/auth";
import InputDialog from './InputDialog.vue';

export default {
  name: 'Home',
  data() {
    return {
      show: false,
      curDev: null,
      devs: [], 
    }
  },
  methods: {
    loginDev(dev) {
      console.log('login dev:' + dev.alias);
      if (dev.status) {
        this.$router.push({name: 'Camera', params: dev});
      } else {
        this.curDev = dev;
        this.show = true;
      }
    },
    loadDevs() {
      console.log('load devs.');
      axios.get('/api/list', { headers: getHeaders() })
      .then((res) => {
        this.devs = res.data;
      })
      .catch((error) => {
        if (error.status === 400) {
          this.$notify({ type: "danger", message: "参数错误！" });
        } else if (error.status === 503) {
          this.$notify({ type: "danger", message: error.error });
          console.log(error.error);
        } else if (error.status === 403) {
          this.$notify({ type: "danger", message: "无访问权限！" });
          console.log("无访问权限！");
        } else {
          this.$notify({ type: "danger", message: "未知错误！" });
          console.log("未知错误！");
        }
      });
    },
    onDialog(ret, dev, user, pwd) {
      console.log(`ret=${ret}, user=${user}, pwd=${pwd}, show=${this.show}`);
      this.show = false;
      if (!ret) {
        return;
      }
      axios.post('/api/login', {devId: dev.devId, username: user, password: pwd}, { headers: getHeaders() })
      .then((res) => {
        if (res.data.result) {
          dev.path = res.data.path;
          dev.status = true;
          this.$router.push({name: 'Camera', params: dev});
        } else {
          this.$notify({ type: "danger", message: "非摄像头设备或者账号错误！" });
        }
      })
      .catch((error) => {
        if (error.status === 400) {
          this.$notify({ type: "danger", message: "参数错误！" });
        } else if (error.status === 503) {
          this.$notify({ type: "danger", message: error.error });
          console.log(error.error);
        } else if (error.status === 403) {
          this.$notify({ type: "danger", message: "无访问权限！" });
          console.log("无访问权限！");
        } else {
          this.$notify({ type: "danger", message: "未知错误！" });
          console.log("未知错误！");
        }
      });
    },
  },
  created() {
    this.loadDevs();
    setInterval(() => {
      this.loadDevs();
    }, 5000);
  },
  components: {
    'input-dialog': InputDialog,
  },
}
</script>

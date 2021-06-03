<template>
  <div>
    <van-dialog title="输入账号" v-model="show" show-cancel-button @open="onOpen" @confirm="onInputDlg(true)" @cancel="onInputDlg(false)">
      <van-cell-group>
        <van-field v-model="user" label="账号" placeholder="请输入账号" />
        <van-field v-model="pwd" type="password" label="密码" />
      </van-cell-group>
    </van-dialog>
  </div>
</template>

<script>
import { Dialog } from 'vant';

export default {
  name: 'InputDialog',
  props: ["show", 'dev'],
  data() {
    return {
      user: 'admin',
      pwd: 'admin',
    }
  },
  methods: {
    onInputDlg(ret) {
      console.log('ret:' + ret);
      this.$emit('close', ret, this.dev, this.user, this.pwd);
    },
    onOpen() {
      this.user = 'admin';
      this.pwd = 'admin';
    }
  },
  components: {
    'van-dialog': Dialog.Component,
  },
}
</script>

<template>
  <div class="about">
    <van-nav-bar title="在线监控" left-arrow @click-left="goBack()" class="safe-area-top"/>
    <player :dev="dev"></player>
  </div>
</template>

<script>
import Player from './Player.vue';

export default {
  name: 'Camera',
  data() {
    return {
      dev: {}
    }
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },
  },
  created() {
    console.log('create');
    this.dev = this.$route.params;
  },
  components: {
    "player": Player
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.font-color{
  color: #1989fa
}
.font {
  text-align: left
}
</style>

import Vue from 'vue';
import App from './App.vue';
import router from './router';
import Vant from 'vant';
import 'vant/lib/index.css';

import {Notify} from 'vant';
import {edger} from '@edgeros/web-sdk';
import {setToken, setSrand} from './lib/auth';
import {setPerms, checkPerms, requestPerm} from './lib/permission';

console.log(typeof Module);
console.log(typeof NodePlayer);

Vue.config.productionTip = false;

Vue.use(Vant);
Vue.use(Notify);

edger.onAction('permission', (data) => {
	setPerms(data);
});

edger.onAction('token', (result) => {
  const { token, srand } = result;
  setToken(token);
  setSrand(srand);
});

edger.token()
.then((result) => {
  const {token, srand} = result;
  setToken(token);
  setSrand(srand);
})
.then(() => {
	var ret = checkPerms();
	if (ret.length > 0) {
		requestPerm();
	}
})
.catch((err) => {
  console.error(err);
})
.finally(() => {
  NodePlayer.load(()=>{
    new Vue({
      router,
      render: h => h(App),
    }).$mount('#app');
  });
});

import Vue from 'vue'
import Router from 'vue-router'
import PokerCanvas from '@/components/gameview/PokerCanvas'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'PokerCanvas',
      component: PokerCanvas
    }
  ]
})

<template>
  <div style="width: 100%; height: 80%; margin-top: 50px;">
    <canvas ref="canvas" resize></canvas>
  </div>
</template>

<script>


import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'
import paper from 'paper'

import TableControllerCreator from '@/domain/table/TableController';

var pokerHupTableController = null; // Contains whole business side of the app.

export default {
  name: 'PokerCanvas',
  data () {
    return {
      ready: false
    }
  },
  mounted() {
    paper.setup(this.$refs.canvas);

    paper.project.activate();

    var svg = '/static/svg/table.svg';

    pokerHupTableController = TableControllerCreator(this);

    pokerHupTableController.init();

    paper.project.importSVG(svg, {
        onLoad: this.startLoadingPaperStuffIn.bind(this),
    });
  },
  beforeDestroy() {
    pokerHupTableController.onDestroy();
    pokerHupTableController = null;

    paper.project.clear();
    paper.project.remove();
  },
  methods: {

    startLoadingPaperStuffIn(tableSVG) {
      return pokerHupTableController.onTableLoad(tableSVG)
      .then(() => {
        // TableController loaded
        console.log("TableController fully ready");

      })
      .then(() => {
        this.ready = true;
      })
      .delay(100)
      .then(() => {
        console.log(paper)
      })
      .delay(100)
      .then(pokerHupTableController.dealHoleCards.bind(null, ['ah', 'ad']))
      .delay(500)
      .then(pokerHupTableController.playFlop.bind(null, ['3c', 'kc', 'td']));      
      
    },





  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  canvas {
    width: 100%;
    height: 100%;
  }

</style>

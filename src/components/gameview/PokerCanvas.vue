<template>
  <div style="width: 100%; height: 80%; margin-top: 50px;">
    <canvas ref="canvas" resize></canvas>
    <button v-if="!connected" @click="connectToServer" style="position: fixed; top: 0; left: 0;">Connect</button>
    <p v-else style="position: fixed; top: 4px; left: 4px;">Welcome to pokerhup-server. Version is {{serverVersion}}</p>
    <button v-on:click="showHandDebugHistory" style="position: fixed; top: 0; right: 0;">Debug hands</button>
  </div>
</template>

<script>


import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'
import paper from 'paper'

import TableControllerCreator from '@/domain/table/TableController';
import GameController from '@/domain/GameController';
import Network from '@/network/Network';

// Testing deps
import FakeNetwork from '@/network/FakeNetwork';

// These should be kept outside Vue data reactivity stuff.

var pokerHupTableController = null; // Contains whole graphics side of the app.
var pokerHupGameController  = null; // Contains whole business logic of the app.
var pokerHupNetwork         = null; // Provides API to interact with server. 

// Setup bluebird Promise cancellation as active
Promise.config({
  cancellation: true
});

export default {
  name: 'PokerCanvas',
  data () {
    return {
      serverVersion: '???',
      connected: false,
      ready: false
    }
  },
  mounted() {
    
    // Refactor: All paper.js stuff moved to TableController.

    paper.setup(this.$refs.canvas);

    paper.project.activate();

    var svg = '/static/svg/table.svg';

    // Singletons to form static structure of the app.
    pokerHupTableController = TableControllerCreator(this);

    pokerHupNetwork = new Network(function(serverVersion) {
      this.serverVersion = serverVersion;
    }.bind(this));

    pokerHupGameController = new GameController(pokerHupTableController, pokerHupNetwork);

    // Connect network to Game controller
    pokerHupNetwork.setMsgGateway(pokerHupGameController.serverMessageCb.bind(pokerHupGameController));

    paper.project.importSVG(svg, {
        onLoad: this.startLoadingPaperStuffIn.bind(this),
    });
  },
  beforeDestroy() {
    // Destroy deps in reverse order
    pokerHupNetwork.onDestroy();
    pokerHupGameController.onDestroy();
    pokerHupTableController.onDestroy();

    pokerHupTableController = null;
    pokerHupGameController = null;
    pokerHupNetwork = null;

    paper.project.clear();
    paper.project.remove();
  },
  methods: {
    connectToServer() {
      console.log("Connecting to server");
      pokerHupNetwork.connect();
      this.connected = true;

    },
    showHandDebugHistory() {
      var handHistory = pokerHupGameController.getHandDebugHistory();
      if (!handHistory) {
        console.warn("No hand debug history");
        return;
      }
      console.log("----- HAND DEBUG HISTORY ----");
      console.log(handHistory);

      if (handHistory.length === 0) {
        return;
      }

      console.log("---- LAST HAND ----");
      var lastHand = handHistory[handHistory.length-1];
      console.log("Common cards");
      console.log(lastHand.handState.communityCards);
      console.log("Hole cards");
      console.log("P1: " + lastHand.handState.holeCards.p1[0] + "," + lastHand.handState.holeCards.p1[1]);
      console.log("P2: " + lastHand.handState.holeCards.p2[0] + "," + lastHand.handState.holeCards.p2[1]);      
      
    },
    createTestRect() {

      // Create Group that holds all objects for our Christmas tree.
      var xmasTree = new paper.Group({});
      xmasTree.applyMatrix = false;
      xmasTree.position = {x: 100, y: 0}
      // Create tree 
      var tree = new paper.Path.Rectangle(
        // Rectangle top-left point
        new paper.Point(0, 0),
        // Tree trunks size
        new paper.Size(20, 20)
      );
      tree.fillColor = 'green';

      xmasTree.addChild(tree);

      // Whats the global position of tree?

    },
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
      .delay(500)
      .then(pokerHupGameController.readyToPlay.bind(pokerHupGameController));

      /*
      _ue.then(pokerHupTableController.dealHoleCards.bind(null, ['ah', 'ad']))
      .delay(500)
      .then(pokerHupTableController.playFlop.bind(null, ['3c', 'kc', 'td']));     
       */
      
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

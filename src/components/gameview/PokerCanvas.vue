<template>
  <div style="width: 100%; height: 100%;">
    <canvas ref="canvas" resize></canvas>
  </div>
</template>

<script>

import paper from 'paper'
import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'

import TableControllerCreator from '@/domain/TableController';

var tableSVGRef;
var tableLayer;

var pokerHupController = null; // Contains whole business side of the app.

export default {
  name: 'PokerCanvas',
  data () {
    return {
      ready: false,
      currentViewSize: {
        width: 0,
        height: 0
      }
    }
  },
  mounted() {
    paper.setup(this.$refs.canvas);

    paper.project.activate();

    var svg = '/static/svg/table.svg';

    pokerHupController = TableControllerCreator(this);

    pokerHupController.init();

    paper.project.importSVG(svg, {
        onLoad: this.onTableLoad
    });
  },
  beforeDestroy() {
    pokerHupController.onDestroy();
    pokerHupController = null;
  },
  methods: {

    onTableLoad(tableSVG) {
      console.log("onTableLoad");
      console.log(paper.view.size);

      tableLayer = new paper.Layer({
          name: 'tableLayer',
          children: [tableSVG],
          position: paper.project.view.center
      });

      tableLayer.applyMatrix = false;
      tableLayer.pivot = {x: 0, y: 0};
      tableLayer.activate();

      pokerHupController.setTableLayer(tableLayer);
      pokerHupController.setTable(tableSVG);

      pokerHupController.setButtons(this.createButtonBar());

      
      tableSVG.applyMatrix = false;

      //tableSVG.position = new paper.Point(900, 600);

      tableSVG.name = 'tableSVG';

      tableSVG.fitBounds(paper.view.size);

      paper.view.autoUpdate = true;

      this.ready = true;

      paper.view.onResize = this.onResize.bind(this);
      paper.view.onFrame = this.onFrame.bind(this);

      return Promise.resolve()
      .then(this.createCards.bind(this))
      .then((cards) => {
        pokerHupController.setCards(cards);
      })
      .then(() => {
        this.ready = true;
      })
      .delay(1000)
      .then(pokerHupController.playFlop);

    },

    createButtonBar: function() {
      var buttonsGroup = new paper.Group({
        name: 'buttonsGroup',
        position: {x: 500, y: 0},
        //bounds: new paper.Rectangle(paper.project.view.bottomLeft, new paper.Size(80, 20)),
        fillColor: 'blue'
      });

      pokerHupController.getTableLayer().addChild(buttonsGroup);

      buttonsGroup.pivot = {x: 0, y: 0};

      buttonsGroup.applyMatrix = false;

      var point = new paper.Point(200, 20);
      var size = new paper.Size(60, 60);
      var path = new paper.Path.Rectangle(point, size);
      path.strokeColor = 'black';
      path.name = 'raiseButton'

      buttonsGroup.addChild(path);

      path.position = {x: 0, y: 0};


      //buttonsGroup.position = {x: 500, y: 0};

      buttonsGroup.bringToFront();

      // Create buttons
      return buttonsGroup;
    },

    createCards: function() {

      // Cards have no group as they need to be able to roam free.

      return new Promise(function(resolve, reject) {
        paper.project.importSVG('/static/svg/facecard.svg', {
          onLoad: function(facecardSVG) {
            facecardSVG.visible = false;
            var facecards = _.times(6, (nth) => {
              var c = facecardSVG.clone();
              c.visible = false; // Hidden by default
              return c;
            });

            resolve({cards: null, facecards: facecards});          
          }
        });
        
      })


    },

    onResize: function(event) {

        if (!this.ready || !this.$refs.canvas) {
            return;
        }

        var that = this;

        // let's fit field always to bounds
        tableLayer.fitBounds(paper.view.size);

        this.updateCurrentSize();
    },

    onFrame: function() {
      //console.log("onFrame");
      //paper.project.getItem({name: 'buttonsGroup'}).position.y += 1;
      //paper.project.getItem({name: 'raiseButton'}).position.x += 1;

      TWEEN.update();

    },

    updateCurrentSize: function() {
        this.currentViewSize.width = this.$refs.canvas.offsetWidth;
        this.currentViewSize.height = this.$refs.canvas.offsetHeight;
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

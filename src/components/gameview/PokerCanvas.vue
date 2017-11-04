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

var DEF_WIDTH_OF_CANVAS = 1000;

var defWidths = {
  table: null,
  card: null
}

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

    paper.project.clear();
    paper.project.remove();
  },
  methods: {

    onTableLoad(tableSVG) {
      defWidths.table = tableSVG.bounds.width;

      console.log("onTableLoad");
      console.log(paper.view.size);

      var objectRepository = pokerHupController.getRepository();

      tableLayer = new paper.Layer({
          name: 'tableLayer',
          children: [tableSVG],
          position: paper.project.view.center
      });

      tableLayer.applyMatrix = false;
      tableLayer.pivot = {x: 0, y: 0};
      tableLayer.activate();

      objectRepository.setTableLayer(tableLayer);
      objectRepository.setTable(tableSVG);

      objectRepository.setButtons(this.createButtonBar());

      
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
        objectRepository.setCards(cards);
      })
      .then(() => {
        this.ready = true;
      })
      .delay(1000)
      .then(pokerHupController.dealHoleCards)
      .delay(500)
      .then(pokerHupController.playFlop);

    },

    // Point translations
    translateRelativeToProjectPoint: function(relPoint) {

      var tableBounds = pokerHupController.getRepository().getTable().bounds;

      console.warn("Table bounds");
      console.log(tableBounds);

      return { 
        x: tableBounds.x + tableBounds.width * relPoint.x, 
        y: tableBounds.y + tableBounds.height * relPoint.y 
      };
        
    },

    relativeSize: function(size) {
        var tableLayer = pokerHupController.getRepository().getTableLayer();
        var scaledSize = tableLayer.bounds.width * size;

        return scaledSize;
    },

    createButtonBar: function() {
      var buttonsGroup = new paper.Group({
        name: 'buttonsGroup',
        position: {x: 500, y: 0},
        //bounds: new paper.Rectangle(paper.project.view.bottomLeft, new paper.Size(80, 20)),
        fillColor: 'blue'
      });

      pokerHupController.getRepository().getTableLayer().addChild(buttonsGroup);

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
    setScaling: function() {



    },

    setOrigScaling: function(paperItem, widthRelativeToTableWidth) {

      widthRelativeToTableWidth = widthRelativeToTableWidth || 1;

      var currScalingFactor = pokerHupController.getRepository().getTable().bounds.width / defWidths.table;

      console.log("Curr scaling factor is " + currScalingFactor);

      var currScale = paperItem.getScaling().x;

      paperItem.scale(currScalingFactor / currScale * widthRelativeToTableWidth);
    },

    createCards: function() {

      var that = this;

      var cardsGroup = new paper.Group({
        name: 'cardsGroup',
        position: {x: 0, y: 0}
      });

      cardsGroup.applyMatrix = false;
      cardsGroup.pivot = {x: 0, y: 0};

      var cardsContainer = {
        group: cardsGroup,
        facecards: null,
        cards: null
      }

      return new Promise(function(resolve, reject) {
        paper.project.importSVG('/static/svg/cards/sface.svg', {
          onLoad: function(facecardSVG) {
            facecardSVG.visible = false;
            var cardToTable = facecardSVG.bounds.width / defWidths.table;
            console.log("Face card rel to table: " + cardToTable);

            that.setOrigScaling(facecardSVG, 1.4);

            var facecards = _.times(6, (nth) => {
              var c = facecardSVG.clone();
              c.visible = false; // Hidden by default
              cardsGroup.addChild(c);
              return c;
            });
            // Set facecards
            cardsContainer.facecards = facecards;

            resolve();          
          }
        });
        
      })
      .then(() => {
        // Load all actual cards

        var ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 't', 'j', 'q', 'k', 'a'];
        var suits = ['h', 'd'];

        var cards = [];

        _.each(ranks, (rank) => {
          _.each(suits, (suit) => {
            cards.push(rank + "" + suit);
          });
        });

        return cards;


      })
      // Load all card svgs individually
      .map((card) => {
        return new Promise(function(resolve, reject) {
          console.log("Loading card " + card);
          paper.project.importSVG('/static/svg/cards/s' + card + '.svg', {
            onLoad: function(paperCardItem) {
              console.log(paperCardItem);
              console.log("Paper card loaded!")
              paperCardItem.visible = false;
              paperCardItem.pokerhup_name = card;
              that.setOrigScaling(paperCardItem, 1.4);
              cardsGroup.addChild(paperCardItem);
              resolve(paperCardItem);
            }
          })
        });
      })
      .then((paperCards) => {
        console.warn("All cards loaded");
        cardsContainer.cards = paperCards;

        // Return cardsContainer to original caller of createCards!
        return cardsContainer;

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

import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'
import paper from 'paper'

function PaperObjectRepository() {
    this.objects = {
        table: null,
        tableLayer: null,
        buttons: null,
        cards: {
            group: null,
            facecards: [],
            cards: [],
        },
    }

    this.getFaceCard = function() {
        // Find first free card
        return _.find(this.objects.cards.facecards, (fc) => {
            return !fc.pokerhup_state;
        })
    }

    this.getCard = function(cardName) {
        // For now we return facecard.
        //return this.getFaceCard();

        return _.find(this.objects.cards.cards, (c) => {
            return c.pokerhup_name === cardName;
        })
    }

    this.setTable = function(table) {
        this.objects.table = table;
    }
    this.getTable = function() {
        return this.objects.table;
    }
    this.setTableLayer = function(layer) {
        this.objects.tableLayer = layer;
    }

    this.getTableLayer = function() {
        if (!this.objects.tableLayer) {
            throw new Error('tableLayer is null in TableController');
        }

        return this.objects.tableLayer;
    }

    this.setButtons = function(group) {
        this.objects.buttons = group;
    }

    this.setCards = function(cards) {
        this.objects.cards.group = cards.group;
        this.objects.cards.facecards = cards.facecards;
        this.objects.cards.cards = cards.cards;

        console.log(this.objects.cards.cards);
    }  
} 

export default function(pokerCanvas) {

    ///////////////// PAPER JS VARS/DEPS /////////////////////////
    var DEF_WIDTH_OF_CANVAS = 1000;

    var defWidths = {
      table: null,
      card: null
    }

    var ready = false;

    var currentViewSize = {
        width: 0,
        height: 0
    }

    var tableSVGRef;
    var tableLayer;

    // Object repository is only available from here (TableController)
    // as it is specific dependency for graphical operations!
    // Actual business code / poker logic code should not need it ever!
    var paperObjects = new PaperObjectRepository();   


    /////////////// STATE OF THE BOARD /////////////////////////

    var state = {
        board: {
            // Cards
            cards: {
                flop: [],
                turn: null,
                river: null,
                p1Hand: {1: null, 2: null},
                p2Hand: {1: null, 2: null},
            },
            bets: {
                pot: null,
                p1Bets: null,
                p2Bets: null,
            },
            button: null,
            toAct: null, // Player ID
        }
    }

    ///////////////// POSITIONS AND CONFIG /////////////////////////
    
    // Move to config later
    var centerCards_FirstX = 0.375;
    var centerCards_Y = 0.43;
    var centerCards_OffsetX = 0.06;

    var POSITIONS = {
        // Static positions
        deck: {x: 0.65, y: 0.15},
        
        flop: {
            1: {x: centerCards_FirstX + centerCards_OffsetX*0, y: centerCards_Y},
            2: {x: centerCards_FirstX + centerCards_OffsetX*1, y: centerCards_Y},
            3: {x: centerCards_FirstX + centerCards_OffsetX*2, y: centerCards_Y},
        },
        turn: 
            {x: centerCards_FirstX + centerCards_OffsetX*3, y: centerCards_Y},
        river: 
            {x: centerCards_FirstX + centerCards_OffsetX*4, y: centerCards_Y},

        // Player cards
        p1: {
            1: {x: 0.1, y: 0.6},
            2: {x: 0.142, y: 0.6},
        },  
        p2: {
            1: {x: 0.9, y: 0.6},
            2: {x: 0.858, y: 0.6},
        },           
    }

    // Animation test
    // All anims should be moved to AnimationController!
    var animateMovementTo = function(facecard, newRelativePosition, resolve, reject) {

        console.warn("animateMovementTo");
        console.warn(newRelativePosition);
        console.warn(facecard);

        var projectPoint = translateRelativeToProjectPoint(newRelativePosition);

        console.warn("projectPoint");
        console.error(projectPoint);

        var moveTween = new TWEEN.Tween(facecard.position)
            .to({x: projectPoint.x, y: projectPoint.y}, 200)
            //.easing(TWEEN.Easing.Quadratic.In)
            .onComplete(function() {
                resolve();
            });

        moveTween.start();    

    }

    var animateObjectMovementTo = function(paperItem, newRelativePosition, duration, resolve, reject) {
        var projectPoint = translateRelativeToProjectPoint(newRelativePosition);

        duration = duration || 500;

        console.error("animateObjectMovementTo");
        console.log(paperItem.position);
        console.log(newRelativePosition);
        console.log(projectPoint)


        var moveTween = new TWEEN.Tween(paperItem.position)
            .to({x: projectPoint.x, y: projectPoint.y}, duration)
            //.easing(TWEEN.Easing.Quadratic.In)
            /*
            .onStart(function() {
                var rotationTween = new TWEEN.Tween(paperItem)
                .to({rotation: 180}, duration);

                rotationTween.start();
            })
            */
            .onComplete(function() {
                resolve(paperItem); // For chaining
            });

        moveTween.start();            
    }

    var relocateObjectGlobally = function(paperItem, relPos) {
        paperItem.position = translateRelativeToProjectPoint(relPos);
    }

    // Point translations
    var translateRelativeToProjectPoint = function(relPoint) {

      var tableBounds = paperObjects.getTable().bounds;

      console.warn("Table bounds");
      console.log(tableBounds);

      return { 
        x: tableBounds.x + tableBounds.width * relPoint.x, 
        y: tableBounds.y + tableBounds.height * relPoint.y 
      };
        
    }

    var relativeSize = function(size) {
        var tableLayer = paperObjects.getTableLayer();
        var scaledSize = tableLayer.bounds.width * size;

        return scaledSize;
    }


    var setScaling = function() {



    }

    var setOrigScaling = function(paperItem, widthRelativeToTableWidth) {

      widthRelativeToTableWidth = widthRelativeToTableWidth || 1;

      var currScalingFactor = paperObjects.getTable().bounds.width / defWidths.table;

      console.log("Curr scaling factor is " + currScalingFactor);

      var currScale = paperItem.getScaling().x;

      paperItem.scale(currScalingFactor / currScale * widthRelativeToTableWidth);
    }
    
    //////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////// INITIALIZATION CODE FOR TABLE CONTROLLER /////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    var onTableLoad = function(tableSVG) {

      defWidths.table = tableSVG.bounds.width;


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

      paperObjects.setTableLayer(tableLayer);
      paperObjects.setTable(tableSVG);

      return Promise.resolve()
      .tap(() => {

          // Rest of setup stuff

          tableSVG.applyMatrix = false;

          //tableSVG.position = new paper.Point(900, 600);

          tableSVG.name = 'tableSVG';

          tableSVG.fitBounds(paper.view.size);

          paper.view.autoUpdate = true;

          paper.view.onResize = _.throttle(onResize, 60);
          paper.view.onFrame = onFrame;

          ready = true;
      })
      .delay(150)
      .then(() => {
        // Create buttons
        return Promise.resolve()
        .then(createButtonBar)
        .then((buttons) => {
            return paperObjects.setButtons(buttons);
        })
      })
      .then(() => {
        // Create cards
        return createCards()
        .then((cards) => {
            return paperObjects.setCards(cards);
        })
      })
      .then(() => {
        ready = true;
      })


      
    }

    var createCards = function() {

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

            setOrigScaling(facecardSVG, 1.4);

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
        var suits = ['h', 'd', 's', 'c'];

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
              setOrigScaling(paperCardItem, 1.4);
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
      


    }

    var createButtonBar = function() {
      return;
      var buttonsGroup = new paper.Group({
        name: 'buttonsGroup',
        position: {x: 500, y: 0},
        //bounds: new paper.Rectangle(paper.project.view.bottomLeft, new paper.Size(80, 20)),
        fillColor: 'blue'
      });

      paperObjects.getTableLayer().addChild(buttonsGroup);

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
    }

    var onResize = function(event) {

        console.log("Resize!")

        if (!ready) {
            return;
        }


        // let's fit field always to bounds

        updateCurrentSize();
        tableLayer.fitBounds(paper.view.size);
    }

    var onFrame = function() {
      //console.log("onFrame");
      //paper.project.getItem({name: 'buttonsGroup'}).position.y += 1;
      //paper.project.getItem({name: 'raiseButton'}).position.x += 1;

      TWEEN.update();

    }

    var updateCurrentSize = function() {
        currentViewSize.width = paper.project.view.element.offsetWidth;
        currentViewSize.height = paper.project.view.element.offsetHeight;

        console.log(currentViewSize)
    }

    return {
        /////////// TABLE LOAD HOOK /////////////
        onTableLoad: onTableLoad,

        ////////////////////////////////////////
        /////// INITIALIZATION STUFF ///////////
        ////////////////////////////////////////
        init: function() {

        },
        getRepository: function() {
            return paperObjects;
        },
        /*
        setTable: function(table) {
            paperObjects.objects.table = table;
        },
        getTable: function() {
            return paperObjects.table;
        },
        setTableLayer: function(layer) {
            paperObjects.tableLayer = layer;
        },
        getTableLayer: function() {
            if (!paperObjects.tableLayer) {
                throw new Error('tableLayer is null in TableController');
            }

            return paperObjects.tableLayer;
        },
        setButtons: function(group) {
            paperObjects.buttons = group;
        },
        setCards: function(cards) {
            paperObjects.cards.group = cards.group;
            paperObjects.cards.facecards = cards.facecards;
            paperObjects.cards.cards = cards.cards;
        },
        */
        // Destructor - will be called right before PokerCanvas gets detached from DOM
        onDestroy: function() {
            console.log("TableController onDestroy")

        },

        ////////////////////////////////////////
        ////////////// USAGE ///////////////////
        ////////////////////////////////////////


        //////////// ANIMATIONS ////////////////

        // Returns Promise
        dealHoleCards: function(ownHoleCards) {
            // acquire objects needed to animate dealing of hole cards.
            var facecards = _.times(4, () => {
                var c = paperObjects.getFaceCard();
                //c.fillColor = 'white'; // Fake this being real card
                // Mark as in use
                c.pokerhup_state = 'preflop-anim';
                //c.visible = true;
                return c;
            });       

            var positionsToDeal = [
                POSITIONS.p1[1],
                POSITIONS.p2[1],
                POSITIONS.p1[2],
                POSITIONS.p2[2]
            ];

            return Promise.resolve(facecards)
            .mapSeries((facecard) => {
                return new Promise(function(resolve, reject) {
                    relocateObjectGlobally(facecard, POSITIONS.deck);
                    // Card is in position to begin animation, thus show it.
                    facecard.visible = true;

                    animateObjectMovementTo(
                        facecard, 
                        positionsToDeal.pop(),
                        250,
                        resolve,
                        reject
                    )
                });

            }) 
            .delay(150)
            .then(() => {
                var ownCard1 = facecards[1];
                var ownCard2 = facecards[3];

                // Setup actual cards beneath face cards.
                var myCards = ownHoleCards;

                var cards = _.times(2, () => {
                    var c = paperObjects.getCard(myCards.pop());
                    //c.fillColor = 'white'; // Fake this being real card
                    // Mark as in use
                    c.pokerhup_state = 'flop-anim';
                    c.sendToBack();
                    //c.visible = true;
                    return c;
                }); 

                relocateObjectGlobally(cards[0], POSITIONS.p1[1]);    
                relocateObjectGlobally(cards[1], POSITIONS.p1[2]);

                // Show them (they are under facecards)
                cards[0].visible = true;    
                cards[1].visible = true;

                // Hide and release facecards
                // Refactor this into better method call (freeObject(paperItem))
                ownCard1.visible = false;
                ownCard1.pokerhup_state = null;

                ownCard2.visible = false;
                ownCard2.pokerhup_state = null;
                // Hide them and release
                console.warn("Face cards dealt!");

            })    

        },

        // Returns Promise
        playFlop: function(flopCards) {
            // Get few cards
            var facecard = paperObjects.getFaceCard();

            var cards = _.times(3, () => {
                var c = paperObjects.getCard(flopCards.pop());
                //c.fillColor = 'white'; // Fake this being real card
                // Mark as in use
                c.pokerhup_state = 'flop-anim';
                //c.visible = true;
                return c;
            });

            console.log("Cards to use");
            console.error(cards);



            // Do animation

            var nthFlopCardNext = 0;

            // Setup facecard to Deck position.
            relocateObjectGlobally(facecard, POSITIONS.deck);
            // Show card
            facecard.visible = true;

            return Promise.resolve({facecard: facecard, cards: cards})
            .tap((cardsContainer) => {
                // Move to Flop 1st position.
                return new Promise(function(resolve, reject) {
                    var p = POSITIONS.flop[1];

                    animateObjectMovementTo(cardsContainer.facecard, POSITIONS.flop[1], 170, resolve, reject);
                });                
            })
            .tap((cardsContainer) => {
                // Facecard is now in position. Move other cards there, put them below facecard
                // and set them visible.
                _.each(cardsContainer.cards, (c) => {
                    relocateObjectGlobally(c, POSITIONS.flop[1]);
                });

                // ensure cards in correct stacking order.
                cardsContainer.cards[2].sendToBack();
                cardsContainer.cards[1].sendToBack();
                cardsContainer.cards[0].sendToBack();

                // ensure facecard on top
                cardsContainer.facecard.bringToFront();
                
                // Now set others visible.
                _.each(cardsContainer.cards, (c) => {
                    c.visible = true;
                });

            })
            .delay(50)
            .tap((cardsContainer) => {
                // Start moving cards to right
                return Promise.all([
                    // 1st card does nothing!

                    // 2nd card moves one position to right.
                    new Promise(function(resolve, reject) {
                        animateObjectMovementTo(
                            cardsContainer.cards[1], 
                            POSITIONS.flop[2],
                            100,
                            resolve, reject
                        )
                        
                    }),
                    // 3rd card moves two positions to right.
                    new Promise(function(resolve, reject) {
                        animateObjectMovementTo(
                            cardsContainer.cards[2], 
                            POSITIONS.flop[3],
                            200,
                            resolve, reject
                        )
                        
                    }),
                    // Facecard card moves three positions to right and disappears.
                    new Promise(function(resolve, reject) {
                        animateObjectMovementTo(
                            cardsContainer.facecard, 
                            POSITIONS.turn,
                            240,
                            resolve, reject
                        )
                    }).then((facecard) => {
                        facecard.visible = false;
                        facecard.pokerhup_state = null; // Freed
                    })                 
                ])
            })
            // Show cards 
            /*
            .tap((cards) => {
                _.each(facecards, (c) => {
                    //c.visible = true;
                    c.fillColor = 'red';
                })
            })
            .map((facecard) => {
                return new Promise(function(resolve, reject) {
                    var p = POSITIONS.flop[++nthFlopCardNext];

                    animateMovementTo(facecard, {
                        x: p.x, 
                        y: p.y
                    }, resolve, reject);
                });
            })
            */
            .then((cardsContainer) => {
                console.warn("Flop anim played!")
                // Mark cards to be in use currently.
                cardsContainer.cards[0].pokerhup_state = 'flop';
                cardsContainer.cards[1].pokerhup_state = 'flop';
                cardsContainer.cards[2].pokerhup_state = 'flop';

            })

        }
    }
};
import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'
import paper from 'paper'

function PaperObjectRepository() {
    this.objects = {
        table: null,
        tableLayer: null,
        buttons: null,
        tableTexts: null,
        buttonChip: null,
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

    this.getFaceCards = function() {
      return this.objects.cards.facecards;
    }

    this.getCard = function(cardName) {
        // For now we return facecard.
        //return this.getFaceCard();

        return _.find(this.objects.cards.cards, (c) => {
            return c.pokerhup_name === cardName;
        })
    }

    this.getAllCards = function() {
      return _.concat(this.objects.cards.facecards, this.objects.cards.cards);
    }

    this.setButtonChip = function(button) {
      this.objects.buttonChip = button;
    }

    this.getButtonChip = function() {
      return this.objects.buttonChip;
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

    this.setTableTexts = function(group) {
      this.objects.tableTexts = group;
    }

    this.getStackTexts = function() {
      return {
        p1: this.objects.tableTexts.getItem({name: 'p1Stack'}),
        p2: this.objects.tableTexts.getItem({name: 'p2Stack'})
      }
    }

    this.getBetsTexts = function() {
      return {
        p1: this.objects.tableTexts.getItem({name: 'p1Bets'}),
        p2: this.objects.tableTexts.getItem({name: 'p2Bets'})
      }
    }

    this.getPotText = function() {
      return this.objects.tableTexts.getItem({name: 'pot'});
    }

    this.getActionTexts = function() {
      return {
        p1: this.objects.tableTexts.getItem({name: 'p1Action'}),
        p2: this.objects.tableTexts.getItem({name: 'p2Action'})
      }      
    }

    this.getTableTexts = function() {
      return this.objects.tableTexts;
    }

    this.setButtons = function(group) {
        this.objects.buttons = group;
    }

    this.getButtonsGroup = function() {
        return this.objects.buttons;
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

    var actionTextRemover = null;


    /////////////// STATE OF THE BOARD /////////////////////////
    var systemState = {
      pendingDecisions: null, // Pending decisions
      pendingDecisionResolver: null,
      pendingAnimationResolver: null,
    }

    var myPlayerId;

    // This should only contain state that can be serialized to JSON!!
    var state = {
        holeCards: [],
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
        staticDeck: {
          first: {x: 0.64, y: 0.15},
          second: {x: 0.645, y: 0.15}
        },
        deck: {x: 0.65, y: 0.15},
        potText: {
          x: 0.47,
          y: 0.53
        },
        
        flop: {
            1: {x: centerCards_FirstX + centerCards_OffsetX*0, y: centerCards_Y},
            2: {x: centerCards_FirstX + centerCards_OffsetX*1, y: centerCards_Y},
            3: {x: centerCards_FirstX + centerCards_OffsetX*2, y: centerCards_Y},
        },
        turn: 
            {x: centerCards_FirstX + centerCards_OffsetX*3, y: centerCards_Y},
        river: 
            {x: centerCards_FirstX + centerCards_OffsetX*4, y: centerCards_Y},

        p1: {
            // Player cards
            1: {x: 0.1, y: 0.6},
            2: {x: 0.142, y: 0.6},
            // Stack text
            buttonChip: {x: 0.24, y: 0.56},
            actionText: {x: 0.08, y: 0.5},
            stackText: {x: 0.08, y: 0.64},
            betsText: {x: 0.26, y: 0.6}
        },  
        p2: {
            // Player cards
            1: {x: 0.9, y: 0.6},
            2: {x: 0.858, y: 0.6},
            // Stack text
            buttonChip: {x: 0.72, y: 0.56},
            actionText: {x: 0.88, y: 0.5},
            stackText: {x: 0.88, y: 0.64},
            betsText: {x: 0.7, y: 0.6}
        },           
    }

    // Animation test
    // All anims should be moved to AnimationController!
    var animateMovementTo = function(facecard, newRelativePosition, resolve, reject) {



        var projectPoint = translateRelativeToProjectPoint(newRelativePosition);



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

        return moveTween;            
    }

    var shuffleDeck = function() {

      console.warn("SHUFFLE DECK");

      // Precondition: All back cards should be at deck position and visible
      var facecards = paperObjects.getFaceCards();

      _.each(facecards, (facecard) => {
        relocateObjectGlobally(facecard, POSITIONS.deck);
        facecard.visible = true;
      });

      return Promise.resolve(facecards)
      .map((facecard) => {
          return Promise.resolve([1,1,1,1])
          .mapSeries(() => {
            return new Promise(function(resolve, reject, onCancel) {
                var moveTween = animateObjectMovementTo(
                    facecard, 
                    {
                      x: POSITIONS.deck.x + (0.05 - Math.random()*0.1), 
                      y: POSITIONS.deck.y + (0.02 - Math.random()*0.04)
                    },
                    Math.random()*80 + 60,
                    resolve,
                    reject
                );

                onCancel(() => {
                  console.warn("Cancelling moveTween")
                  moveTween.stop();
                });
            })
            .then((facecard) => {
              // Move back to deck position
              return new Promise(function(resolve, reject, onCancel) {
                  var moveTween = animateObjectMovementTo(
                      facecard, 
                      POSITIONS.deck,
                      Math.random()*60 + 60,
                      resolve,
                      reject
                  )


                  onCancel(() => {
                    console.warn("Cancelling moveTween")
                    moveTween.stop();
                  });
              })
            })

          })

      })
      .then(() => {
        console.warn("Deck shuffled");
      }) 

    }

    var forceAllFaceCardsToDeckPosition = function() {
      var facecards = paperObjects.getFaceCards();

      _.each(facecards, (facecard) => {
        relocateObjectGlobally(facecard, POSITIONS.deck);
        facecard.visible = false;
      });      

      // Enough for only one to be visible.
      facecards[0].bringToFront();
      facecards[0].visible = true;
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
          console.warn("Ready set to true")
      })
      .delay(150)
      .then(() => {
        // Create button chip
        return Promise.resolve()
        .then(createButtonChip)
        .then((chip) => {
            return paperObjects.setButtonChip(chip);
        })
      })      
      .then(() => {
        // Create buttons
        return Promise.resolve()
        .then(createButtonBar)
        .then((buttons) => {
            return paperObjects.setButtons(buttons);
        })
      })
      .then(() => {
        // Create table texts (stack etc.)
        return Promise.resolve()
        .then(createTableTexts)
        .then((textsGroup) => {
            return paperObjects.setTableTexts(textsGroup);
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

    var createButtonChip = function() {
      var path = new paper.Path.Circle({
          center: [80, 50],
          radius: 10,
          strokeWidth: 4,
          strokeColor: 'grey',
          fillColor: 'white'
      });

      path.visible = false;

      return path;
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

        var ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
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

    var createTableTexts = function() {
      var tableTextsGroup = new paper.Group({
        name: 'tableTextsGroup'
      });

      tableTextsGroup.applyMatrix = false;

      tableTextsGroup.pivot = {x: 0, y: 0};
      tableTextsGroup.position = {x: 0, y: 0};

      paperObjects.getTableLayer().addChild(tableTextsGroup);

      // P1 stack
      var stack1 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS.p1.stackText.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS.p1.stackText.y
          },
          content: '---',
          fillColor: 'black',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 16,
          name: 'p1Stack'
      });

      // P2 stack
      var stack2 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS.p2.stackText.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS.p2.stackText.y
          },
          content: '---',
          fillColor: 'black',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 16,
          name: 'p2Stack'
      });

      // P1 Bets
      var bets1 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS.p1.betsText.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS.p1.betsText.y
          },
          content: '---',
          fillColor: 'black',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 20,
          name: 'p1Bets'
      });

      // P2 Bets
      var bets2 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS.p2.betsText.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS.p2.betsText.y
          },
          content: '---',
          fillColor: 'black',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 20,
          name: 'p2Bets'
      });

      // P1 Actions
      var action1 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS.p1.actionText.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS.p1.actionText.y
          },
          content: '',
          fillColor: 'yellow',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 18,
          name: 'p1Action'
      });

      // P2 Actions
      var action2 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS.p2.actionText.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS.p2.actionText.y
          },
          content: '',
          fillColor: 'yellow',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 18,
          name: 'p2Action'
      });

      // Pot
      var pot = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS.potText.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS.potText.y
          },
          content: '---',
          fillColor: 'purple',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 24,
          name: 'pot'
      });

      tableTextsGroup.addChild(stack1);
      tableTextsGroup.addChild(stack2);
      tableTextsGroup.addChild(bets1);
      tableTextsGroup.addChild(bets2);
      tableTextsGroup.addChild(action1);
      tableTextsGroup.addChild(action2);
      tableTextsGroup.addChild(pot);

      tableTextsGroup.visible = true;
      tableTextsGroup.bringToFront();

      return tableTextsGroup;


    }

    var createButtonBar = function() {
   
      var buttonsGroup = new paper.Group({
        name: 'buttonsGroup',
        //bounds: new paper.Rectangle(paper.project.view.bottomLeft, new paper.Size(80, 20)),
        fillColor: 'blue'
      });
      // Setting position AFTER this will cause new position to be applied to kids (none exist)
      // and nothing happens. Setting applyMatrix = false causes buttonsGroup to locally stash
      // its new position, thus allowing kids added later to get correct positioning!
      buttonsGroup.applyMatrix = false;
      buttonsGroup.visible = false;

      paperObjects.getTableLayer().addChild(buttonsGroup);


      buttonsGroup.pivot = {x: 0, y: 0};
      

      buttonsGroup.position = {
        x: paper.project.view.bounds.x + paper.project.view.bounds.width*0.10, 
        y: paper.project.view.bounds.y + paper.project.view.bounds.height*0.75
      };

      var buttons = ['fold', 'check', 'call', 'bet', 'raise', 'all-in'];
      var colors = ['red', 'yellow', 'orange', 'green', 'purple', 'grey'];

      var currI = 0;
      var MAX_BUTTON_WIDTH = 100;

      _.each(buttons, (buttonName) => {
          // Note! We need Group. Can not simply addChild to PathItem.
          var buttonWrapper = new paper.Group({});
          buttonWrapper.name = buttonName + "_button";

          var point = new paper.Point(0, 0);
          var size = new paper.Size(MAX_BUTTON_WIDTH, 60);
          var path = new paper.Path.Rectangle(point, size);

          buttonWrapper.addChild(path);

          path.strokeColor = 'black';
          path.fillColor = colors.shift();
          path.name = buttonName + "_button";
          //path.pivot = {x: 0, y: 0};

          var text = new paper.PointText({
              point: [0, 0],
              content: buttonName,
              fillColor: 'black',
              fontFamily: 'Courier New',
              fontWeight: 'bold',
              fontSize: 20
          });

          buttonWrapper.addChild(text);

          path.position = {x: 0, y: 0};
          text.position = {x: 0, y: 0};

          path.bringToFront();
          text.bringToFront();

          buttonsGroup.addChild(buttonWrapper);
          buttonWrapper.position = {x: currI * (MAX_BUTTON_WIDTH+10), y: 0};

          // Setup event listening
          buttonWrapper.onClick = function() {
            console.log(path.name + ' clicked');
            tableButtonClick(path.name);
          };


          currI++;

      });



      //buttonsGroup.position = {x: 500, y: 0};

      buttonsGroup.bringToFront();


      // Create buttons
      return buttonsGroup;
    }


    ///////////////////////////////////////////////////////////
    ////////////////// TABLE BUTTON LISTENER //////////////////
    ///////////////////////////////////////////////////////////
    var tableButtonClick = function(buttonName) {

        var action = buttonName.split('_')[0];

        if (systemState.pendingDecisions && systemState.pendingDecisions.indexOf(action) !== -1) {
            // Legal action
            var r = systemState.pendingDecisionResolver;

            systemState.pendingDecisions = null;
            systemState.pendingDecisionResolver = null;

            r(action);


            // Hide buttons
            hideDecisionButtons();
        }

    }

    var showDecisionButtons = function(decisionsAvailable) {

      /*
        [
          {action: 'check', data: null},
          {action: 'bet', data: {minBet: ..., maxBet: ...}},
          {...}
        ]
      */
      
        console.warn("DECISIONS AVAILABLE")
        console.warn(decisionsAvailable);

        paperObjects.getButtonsGroup().visible = true;

        _.each(paperObjects.getButtonsGroup().children, (btn) => {
          var decisionName = btn.name.split("_")[0];

          if (decisionsAvailable.indexOf(decisionName) === -1) {
            btn.opacity = 0.3;
          } else {
            btn.opacity = 1;
          }

        });
    }

    var hideDecisionButtons = function() {
        paperObjects.getButtonsGroup().visible = false;
    }

    //////////////////////////////////////////////////////////////////////////////
    ////////////////// RUNTIME MANIPULATION AND QUERY OF PAPER ///////////////////
    //////////////////////////////////////////////////////////////////////////////

    var relocateObjectGlobally = function(paperItem, relPos) {
        paperItem.position = translateRelativeToProjectPoint(relPos);
    }

    // Point translations
    var translateRelativeToProjectPoint = function(relPoint) {

      var tableBounds = paperObjects.getTable().bounds;

      //console.warn("Table bounds");
      //console.log(tableBounds);

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

    var freeCard = function(card) {
      card.pokerhup_state = null;
      card.visible = false;
    }

    var updateActionText = function(playerNumber, newText) {

      var actionTexts = paperObjects.getActionTexts();
      // Reset always first
      actionTexts.p1.content = '';
      actionTexts.p2.content = '';

      actionTexts[playerNumber].content = newText;

      if (actionTextRemover) {
        clearTimeout(actionTextRemover);
        actionTextRemover = null;
      }

      actionTextRemover = setTimeout(function() {
        actionTexts[playerNumber].content = '';
      }, 1500);

    }

    var showWonText = function() {
      tableLayer.clear();

      var action2 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*0.35, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*0.4
          },
          content: 'You won!',
          fillColor: 'green',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 38,
      });

    }

    var showLostText = function() {
      tableLayer.clear();

      var action2 = new paper.PointText({
          point: {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*0.35, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*0.4
          },
          content: 'You lost!',
          fillColor: 'white',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 38,
      });

    }

    return {
        /////////// TABLE LOAD HOOK /////////////
        onTableLoad: onTableLoad,

        setMyPlayerId: function(_myPlayerId) {
          console.warn("My player id is " + _myPlayerId);
          myPlayerId = _myPlayerId;
        },

        foldHand: function(playerNumberWhoFolded) {
          
          updateActionText(playerNumberWhoFolded, 'Fold')
        },
        updateActionText: updateActionText,
        updateStacks: function(stacks) {
          var texts = paperObjects.getStackTexts();
          
          if (stacks) {
            texts.p1.content = stacks.p1;
            texts.p2.content = stacks.p2;
            texts.p1.visible = true;
            texts.p2.visible = true;
          } else if (stacks === 0) {
            // Hide
            texts.p1.visible = false;
            texts.p2.visible = false;
          }

        },
        updateBets: function(bets) {
          var texts = paperObjects.getBetsTexts();
          
          if (bets) {
            texts.p1.content = bets.p1;
            texts.p2.content = bets.p2;
            texts.p1.visible = true;
            texts.p2.visible = true;
          } else if (bets === 0) {
            texts.p1.visible = false;
            texts.p2.visible = false;
          }
        },
        updatePot: function(pot) {
          var text = paperObjects.getPotText();

          if (pot) {
            text.content = pot;
            text.visible = true;
          } else if(pot === 0) {
            text.visible = false;
          }
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

            if (actionTextRemover) {
              clearTimeout(actionTextRemover);
              actionTextRemover = null;
            }

        },

        ////////////////////////////////////////
        ////////////// USAGE ///////////////////
        ////////////////////////////////////////

        showResult: function(winnerId) {
          if (winnerId === myPlayerId) {
            showWonText();
          } else {
            showLostText();
          }
        },

        setButton: function(playerNumber) {
          //alert("Setting button to " + playerNumber);

          var button = paperObjects.getButtonChip();
          var newPos = {
            x: paper.project.view.bounds.x + paper.project.view.bounds.width*POSITIONS[playerNumber].buttonChip.x, 
            y: paper.project.view.bounds.y + paper.project.view.bounds.height*POSITIONS[playerNumber].buttonChip.y
          };

          button.position = newPos;
          // Ensure visible
          button.visible = true;
        },

        /////////// FULL SYNC WITH SERVER //////////
        sync: function(gameState) {
          console.log("Syncing tableController with server state")
        },

        updateBetsOnTable: function(betsByPlayer) {
          console.log("Updating bets on table");
          console.log(betsByPlayer);
        },


        //////////// ANIMATIONS ////////////////

        // Returns Promise
        dealHoleCards: function(ownHoleCards) {

          console.error("Own hole cards");
          console.log(ownHoleCards);

            Array.prototype.push.apply(state.holeCards, ownHoleCards);

            // acquire objects needed to animate dealing of hole cards.
            var facecards = _.times(5, () => {
                var c = paperObjects.getFaceCard();
                //c.fillColor = 'white'; // Fake this being real card
                // Mark as in use
                c.pokerhup_state = 'preflop-anim';
                //c.visible = true;
                return c;
            });    

            var staticDeckCard = facecards.pop();
            relocateObjectGlobally(staticDeckCard, POSITIONS.deck);
            staticDeckCard.visible = true;  
            staticDeckCard.sendToBack();           

            var positionsToDeal = [
                POSITIONS.p1[1],
                POSITIONS.p2[1],
                POSITIONS.p1[2],
                POSITIONS.p2[2]
            ];

            return Promise.resolve(facecards)
            .delay(250)
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

                if (myPlayerId === 'p1') {
                  var ownCard1 = facecards[1];
                  var ownCard2 = facecards[3];
                  
                } else {
                  var ownCard1 = facecards[0];
                  var ownCard2 = facecards[2];
                  
                }

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

                relocateObjectGlobally(cards[0], myPlayerId === 'p1' ? POSITIONS.p1[1] : POSITIONS.p2[1]);    
                relocateObjectGlobally(cards[1], myPlayerId === 'p1' ? POSITIONS.p1[2] : POSITIONS.p2[2]);

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
        dealFlop: function(flopCards) {

            // Setup to board.
            Array.prototype.push.apply(state.board.cards.flop, flopCards);

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

            //console.log("Cards to use");
            //console.error(cards);



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

        },

        dealTurn: function(turnCard) {
            // Setup to board.
            state.board.cards.turn = turnCard;

            // Get few cards
            var facecard = paperObjects.getFaceCard();

            var card = paperObjects.getCard(turnCard);
            card.pokerhup_state = 'turn-anim';


            var nthFlopCardNext = 0;

            // Setup facecard to Deck position.
            relocateObjectGlobally(facecard, POSITIONS.deck);
            // Show card
            facecard.visible = true;

            return Promise.resolve({facecard: facecard, card: card})
            .tap((cardsContainer) => {
                // Move to Flop 1st position.
                return new Promise(function(resolve, reject) {
                    animateObjectMovementTo(cardsContainer.facecard, POSITIONS.turn, 170, resolve, reject);
                });                
            })
            .tap((cardsContainer) => {
                // Facecard is now in position. Move turn card below it, and set it visible.
              
                relocateObjectGlobally(cardsContainer.card, POSITIONS.turn);
           
                cardsContainer.card.sendToBack();

                // ensure facecard on top
                cardsContainer.facecard.bringToFront();
                // Show our real card
                cardsContainer.card.visible = true;
                cardsContainer.card.pokerhup_state = 'turn';
                // Lastly, hide and free facecard.
                cardsContainer.facecard.visible = false;
                cardsContainer.facecard.pokerhup_state = null; // Freed                
               

              

            });
        },

        dealRiver: function(riverCard) {
            // Setup to board.
            state.board.cards.river = riverCard;

            // Get few cards
            var facecard = paperObjects.getFaceCard();

            var card = paperObjects.getCard(riverCard);
            card.pokerhup_state = 'river-anim';

            // Setup facecard to Deck position.
            relocateObjectGlobally(facecard, POSITIONS.deck);
            // Show card
            facecard.visible = true;

            return Promise.resolve({facecard: facecard, card: card})
            .tap((cardsContainer) => {
                // Move to Flop 1st position.
                return new Promise(function(resolve, reject) {
                    animateObjectMovementTo(cardsContainer.facecard, POSITIONS.river, 170, resolve, reject);
                });                
            })
            .tap((cardsContainer) => {
                // Facecard is now in position. Move river card below it, and set it visible.
              
                relocateObjectGlobally(cardsContainer.card, POSITIONS.river);
           
                cardsContainer.card.sendToBack();

                // ensure facecard on top
                cardsContainer.facecard.bringToFront();
                // Show our real card
                cardsContainer.card.visible = true;
                cardsContainer.card.pokerhup_state = 'river';
                // Lastly, hide and free facecard.
                cardsContainer.facecard.visible = false;
                cardsContainer.facecard.pokerhup_state = null; // Freed                
               
            });
        },

        freeUpAllCards: function() {

          console.log("Freeing all cards");

          _.each(paperObjects.getAllCards(), (c) => {
            freeCard(c);
          })

          state.board.cards.flop.length = 0;
          state.board.cards.turn = null;
          state.board.cards.river = null;
          

        },

        waitingForDecisionBy: function(opponentId) {
            console.log("TABLE: Waiting decision from " + opponentId);

        },
        askForDecision: function(decisions) {
            // Change to non-object format (to an array of only decision string)
            var decisions = _.map(decisions, (d) => {return d.action});

            systemState.pendingDecisions = decisions;

            showDecisionButtons(decisions);

            return new Promise(function(resolve, reject) {
                systemState.pendingDecisionResolver = resolve;
            });
        },
        hideDecisionButtons: hideDecisionButtons,

        shuffleDeck: shuffleDeck,
        forceAllFaceCardsToDeckPosition: forceAllFaceCardsToDeckPosition,

    }
};
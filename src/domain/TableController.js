import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'

function ObjectRepository(pokerCanvas) {
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
        return this.objects.cards.facecards.pop();
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

    var paperObjects = new ObjectRepository(pokerCanvas);   

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

    // Move to config later
    var centerCards_FirstX = 0.35;
    var centerCards_Y = 0.43;
    var centerCards_OffsetX = 0.065;

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
            2: {x: 0.12, y: 0.6},
        },  
        p2: {
            1: {x: 0.9, y: 0.6},
            2: {x: 0.88, y: 0.6},
        },           
    }

    // Animation test
    var animateMovementTo = function(facecard, newRelativePosition, resolve, reject) {

        console.warn("animateMovementTo");
        console.warn(newRelativePosition);
        console.warn(facecard);

        var projectPoint = pokerCanvas.translateRelativeToProjectPoint(newRelativePosition);

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
        var projectPoint = pokerCanvas.translateRelativeToProjectPoint(newRelativePosition);

        duration = duration || 500;

        console.error("animateObjectMovementTo");
        console.log(paperItem.position);
        console.log(newRelativePosition);
        console.log(projectPoint)

        var moveTween = new TWEEN.Tween(paperItem.position)
            .to({x: projectPoint.x, y: projectPoint.y}, duration)
            //.easing(TWEEN.Easing.Quadratic.In)
            .onComplete(function() {
                resolve(paperItem); // For chaining
            });

        moveTween.start();            
    }

    var relocateObjectGlobally = function(paperItem, relPos) {
        paperItem.position = pokerCanvas.translateRelativeToProjectPoint(relPos);
    }


    return {
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

        // Returns Promise
        playFlop: function() {
            // Get few cards
            var facecard = paperObjects.getFaceCard();

            var testCards = ['3h', 'kd', 'ah'];

            var cards = _.times(3, () => {
                var c = paperObjects.getCard(testCards.pop());
                //c.fillColor = 'white'; // Fake this being real card
                // Mark as in use
                c.pokerhup_state = 'flop-anim';
                c.visible = true;
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
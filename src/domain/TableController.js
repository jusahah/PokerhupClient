import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'

export default function(pokerCanvas) {

    var paperObjects = {
        table: null,
        tableLayer: null,
        buttons: null,
        cards: {
            facecards: [],
            cards: [],
        },
    };   

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
    var centerCards_FirstX = 0.5;
    var centerCards_Y = 0.5;
    var centerCards_Offset = 0.04;

    var POSITIONS = {
        
        flop: {
            1: {x: centerCards_FirstX + centerCards_Offset*0, y: centerCards_Y},
            2: {x: centerCards_FirstX + centerCards_Offset*1, y: centerCards_Y},
            3: {x: centerCards_FirstX + centerCards_Offset*2, y: centerCards_Y},
        },
        turn: 
            {x: centerCards_FirstX + centerCards_Offset*3, y: centerCards_Y},
        river: 
            {x: centerCards_FirstX + centerCards_Offset*4, y: centerCards_Y},

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
            .to({x: projectPoint.x, y: projectPoint.y})
            .easing(TWEEN.Easing.Quadratic.In)
            .onComplete(function() {
                resolve();
            });

        moveTween.start();    

    }


    return {
        ////////////////////////////////////////
        /////// INITIALIZATION STUFF ///////////
        ////////////////////////////////////////
        init: function() {

        },
        setTable: function(table) {
            paperObjects.table = table;
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
            paperObjects.cards.facecards = cards.facecards;
            paperObjects.cards.cards = cards.cards;
        },
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

            var facecards = _.times(3, () => {
                return paperObjects.cards.facecards.pop();
            });

            // Do animation

            return Promise.resolve(facecards)
            // Show cards 
            .tap((facecards) => {
                _.each(facecards, (c) => {
                    c.visible = true;
                })
            })
            .map((facecard) => {
                return new Promise(function(resolve, reject) {
                    animateMovementTo(facecard, {x: 0.5, y: Math.random() * 0.8 + 0.1}, resolve, reject);
                });
            })
            .then(() => {
                console.warn("Flop anim played!")
            })

        }
    }
};
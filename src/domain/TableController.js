import _ from 'lodash'
import Promise from 'bluebird'
import TWEEN from '@tweenjs/tween.js'

export default function() {

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

    // Animation test
    var animateMovementTo = function(facecard, newRelativePosition, resolve, reject) {

        console.warn("animateMovementTo");
        console.warn(newRelativePosition);
        console.warn(facecard);

        var moveTween = new TWEEN.Tween(facecard.position)
            .to({x: newRelativePosition.x*600, y: newRelativePosition.y * 500})
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
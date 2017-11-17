import _ from 'lodash';
import Promise from 'bluebird';

function FakeNetwork(cb) {

    this.cb = cb;

    this.nonReactive = true;


    // Sketching API

    this.receiveMsg = function(cb) {
        this.cb = cb;
    }

    this.sendMsg = function(domainMsg) {

        if (!this.nonReactive && this.currentlyWaiting.triggerOn === domainMsg.type) {

            this.nonReactive = true; // Disable msg processing until next time.

            var msgBack = this.currentlyWaiting.msgBack;
            var waitAfterMsgBack = this.currentlyWaiting.waitAfterMsgBack;
            var waitBeforeMsgBack = this.currentlyWaiting.waitBeforeMsgBack;

            // Reset
            this.currentlyWaiting = null;

            _.delay(() => {

                this.cb(msgBack);

                _.delay(() => {
                   this.setupCurrentlyWaiting(testrun1.shift());
                }, waitAfterMsgBack || 100);


            }, waitBeforeMsgBack || 50);
        }

    }

    this.setupCurrentlyWaiting = function(triggerItem) {

        // Send payload to the GameController.
        this.cb(triggerItem.msgBack);
        
        if (!triggerItem.triggerOn) {
            // Auto-triggers right away.
            _.delay(
                this.setupCurrentlyWaiting.bind(this, testrun1.shift()), 
                triggerItem.waitAfterMsgBack || 50
            );
        } else {
            // Triggers only when suitable msg comes in from the GameController
            this.currentlyWaiting = triggerItem;
            this.nonReactive = false; // enable
        }
    }

    this.initTestRun = function() {

        this.setupCurrentlyWaiting(testrun1.shift());

    }

}

var testrun1 = [
    {
        triggerOn: 'init_done',
        msgBack: {
            type: 'hand_init', 
            world: {
                stacks: {p1: 990, p2: 995},
                blinds: {p1: 10, p2: 5}
            }
        },
        waitBeforeMsgBack: 500
    },
    {
        triggerOn: null, // Auto-trigger after prev done
        msgBack: {
            type: 'hand_preflop_deal',
            world: {
                stacks: {p1: 990, p2: 995}
            },
            hand: {
                bets: {p1: 10, p2: 10}, 
                pot: 0, 
                commonCards: [],
                toAct: null
            },
            cards: {
                p1: ['jh', 'ts'],
                p2: null // Not shown to this player
            } 
            
        },
        waitAfterMsgBack: 1500, // For animation to play
    },
    {
        triggerOn: null, // Auto-trigger after prev done
        msgBack: {
            type: 'hand_waiting_decision', 
            toDecide: 'p2', // Opponent to decide
            decisions: ['fold', 'call', 'raise']
        },
        waitAfterMsgBack: 2000,
    },    
    // We assume opponent called
    {
        triggerOn: null, // Auto-trigger after prev done
        msgBack: {
            type: 'hand_update', 
            hand: {
                bets: {p1: 10, p2: 10}, 
                pot: 0, 
                commonCards: [],
                toAct: null
            },
        },
        waitAfterMsgBack: 200,
    }, 
    {
        triggerOn: null, // Auto-trigger after prev done
        msgBack: {
            type: 'hand_waiting_decision', 
            toDecide: 'p1',
            decisions: ['check', 'raise']
        },
        waitAfterMsgBack: 200,
    }, 
    // Assumes test player checks
    {
        triggerOn: 'hand_decision_made', 
        msgBack: {
            type: 'hand_update', 
            hand: {
                bets: null, 
                pot: 20, 
                commonCards: [],
                toAct: null
            },
        },
        waitAfterMsgBack: 500,
    },
    // Play flop
    {
        triggerOn: null, 
        msgBack: {
            type: 'hand_flop_deal', 
            hand: {
                bets: null, 
                pot: 20, 
                commonCards: ['as', '7d', '7c'],
                toAct: null
            },
        },
        waitAfterMsgBack: 1500, // For flop animation
    },   
    {
        triggerOn: null, // Auto-trigger after prev done
        msgBack: {
            type: 'hand_waiting_decision', 
            toDecide: 'p1',
            decisions: ['check', 'bet']
        },
        waitAfterMsgBack: 200,
    },  
];

export default FakeNetwork;
// Game states
import WaitingNextHand from '@/domain/fsm/WaitingNextHand';
import StartingNextHand from '@/domain/fsm/StartingNextHand';
import WaitingGameStart from '@/domain/fsm/WaitingGameStart';

// Hand states
import WaitingMyDecision from '@/domain/fsm/hand/WaitingMyDecision';
import WaitingOpponentDecision from '@/domain/fsm/hand/WaitingOpponentDecision';
import Animating from '@/domain/fsm/hand/Animating'

function GameController(tableController, network) {
    
    // Ref to TableController
    this.tableController = tableController;
    // Network
    this.network = network;

    // Own player ID (in Game, will be given by server)
    this.myPlayerId = null;

    // Current app state tree.
    this._stateTree = null;
    // Current state
    this.currentState = null;

    // Current action promise that is being fulfilled by Table
    this.currentTablePromise = null;
    // Current waiting action ID
    // This is auto-inc int that tells whether some 
    // waited action has already been pre-empted/cancelled.
    this.currentTablePromiseId = 0;

    this.gameHasEnded = false;

    /// INITIALIZATION STUFF
    this.readyToPlay = function() {

        // Send info to server
        var msg = {
            type: 'init_done'
        };

        this.network.sendMsg(msg);

        this.tableController.hideDecisionButtons();

    }

    // DESTRUCTION STUFF
    this.onDestroy = function() {

    }

    /// SERVER MESSAGE GATEWAY
    this.serverMessageCb = function(msgType, msgFromServer, answerResolver) {

        console.warn("From server: " + msgType);
        console.warn(msgFromServer);

        if (msgType === 'opponent_disconnected') {
            this.network.disconnect();
            if (!this.gameHasEnded) {
                // Irregural disconnect, alert user.
                alert('Opponent disconnected - Game is over');
                
            }

        }

        if (msgType === 'settings_init') {
            this.myPlayerId = msgFromServer.playerNumber;
            this.tableController.setMyPlayerId(this.myPlayerId);
        }

        if (msgType === 'game_ended') {
            this.gameHasEnded = true;
            console.error("Game ended msg");
            console.log(msgFromServer);
            var winnerId = msgFromServer.winner;

            this.tableController.showResult(winnerId);
        }

        ///////////////////////////////////////
        /////////// HAND SYNC /////////////////
        ///////////////////////////////////////

        if (msgType === 'stacks_bets_pot_update') {
            console.log("Updating stacks, bets and pot");
            this.tableController.updateStacks(msgFromServer.stacks);
            this.tableController.updateBets(msgFromServer.bets);
            this.tableController.updatePot(msgFromServer.pot);

        }

        if (msgType === 'hand_init') {
            this.tableController.setButton(msgFromServer.button);
            this.tableController.updateActionText('p1', '');
            this.tableController.updateActionText('p2', '');
            
            this.changeLocalState(new StartingNextHand(/*msgFromServer.world*/));
        }

        if (msgType === 'hand_showdown') {
            this.tableController.showDown(msgFromServer.cards);
        }

        if (msgType === 'hand_showdown_values') {
            this.tableController.updateActionText('p1', msgFromServer.p1);
            this.tableController.updateActionText('p2', msgFromServer.p2, true);
        }

        if (msgType === 'hand_showdown_gather_winnings') {
            this.tableController.updateStacks(msgFromServer.stacks);
            this.tableController.updateBets(0);
            this.tableController.updatePot(0);
        }

        if (msgType === 'hand_decision_made') {
            this.tableController.updateActionText(msgFromServer.decider, msgFromServer.decision);
        }

        if (msgType === 'hand_folded') {
            this.tableController.foldHand(msgFromServer.folder);
        }

        if (msgType === 'hand_ended') {
            var newStacks = msgFromServer.stacks;

            this.tableController.freeUpAllCards();
            this.changeLocalState(new WaitingNextHand());
        }

        //////////////////////////////////////
        /////////// Table updates ////////////
        //////////////////////////////////////

        if (msgType === 'hand_preflop_deal') {

            // Get own cards
            var myCards = msgFromServer.cards[this.myPlayerId];

            this.changeLocalState(new Animating('preflop_deal', myCards));

            // Call TableController
            // this.tableController.dealHoleCards(myCards);

        } else if (msgType === 'hand_flop_deal') {
            this.changeLocalState(new Animating('flop_deal', msgFromServer.communityCards));
            //this.tableController.dealFlop(msgFromServer.hand.commonCards);
        } else if (msgType === 'hand_turn_deal') {
            this.changeLocalState(new Animating('turn_deal', msgFromServer.communityCards));
            //this.tableController.dealFlop(msgFromServer.hand.commonCards);
        } else if (msgType === 'hand_river_deal') {
            this.changeLocalState(new Animating('river_deal', msgFromServer.communityCards));
            //this.tableController.dealFlop(msgFromServer.hand.commonCards);
        }


        ///////////////////////////////////
        /////////// My actions ////////////
        ///////////////////////////////////
        /*
        else if (msgType === 'hand_waiting_decision') {

            if (msgFromServer.toDecide === this.myPlayerId) {
                // My decision
                this.changeLocalState(new WaitingMyDecision(msgFromServer.decisions));
            } else {
                // Somebody else's decision
                this.changeLocalState(new WaitingOpponentDecision(msgFromServer.toDecide));
            }
        }
        */

        else if (msgType === 'decide') {
            this.changeLocalState(new WaitingMyDecision(
                msgFromServer.bets, 
                msgFromServer.decisions, 
                answerResolver
            ));
        }

        
    }

    this.handUpdateReceived = function(handData) {

        this.tableController.forceHandUpdate(handData);

    }

    /*
    this.waitOpponentDecision = function(opponentId) {

        this.tableController.waitingForDecisionBy(opponentId);

    }
    */

    ///////////////////////// STATE CHANGES //////////////////////////
    
    this.changeLocalState = function(state) {
        if (this.currentState) {
            this.currentState.exit();
            console.error("Exited state: " + this.currentState.constructor.name);
        }

        this.currentState = state;
        this.currentState.setupDeps(this, this.tableController, this.network);

        this.currentState.enter();
        console.error("Entered state: " + this.currentState.constructor.name);

    }

}

export default GameController;
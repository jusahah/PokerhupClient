import State from '@/domain/fsm/State';

function WaitingOpponentDecision(opponentId) {
    State.call(this);

    this.waitingOpponentOfId = opponentId;
}


WaitingOpponentDecision.prototype = Object.create(State.prototype);
WaitingOpponentDecision.prototype.constructor = WaitingOpponentDecision;

WaitingOpponentDecision.prototype.enter = function() {
    // Setup UI to show opponent is deciding...
}

WaitingOpponentDecision.prototype.exit = function() {
    // Clear UI
}

export default WaitingOpponentDecision
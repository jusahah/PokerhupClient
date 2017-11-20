import State from '@/domain/fsm/State';

function WaitingGameStart() {
    State.call(this);
}


WaitingGameStart.prototype = Object.create(State.prototype);
WaitingGameStart.prototype.constructor = WaitingGameStart;

export default WaitingGameStart


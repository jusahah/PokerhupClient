import State from '@/domain/fsm/State';

function WaitingNextHand() {
    State.call(this);
}


WaitingNextHand.prototype = Object.create(State.prototype);
WaitingNextHand.prototype.constructor = WaitingNextHand;

export default WaitingNextHand
import { GameTag, Step } from '@firestone-hs/reference-data';
import { isMercenaries } from '../hs-utils';
import { Replay } from '../model/replay';

export const totalDurationExtractor = (replay: Replay): number => {
	const timestampedNodes = replay.replay.findall('.//TagChange[@ts]');
	const firstTimestampInSeconds = toTimestamp(timestampedNodes[0].get('ts'));
	let lastTimestampInSeconds = toTimestamp(timestampedNodes[timestampedNodes.length - 1].get('ts'));
	if (lastTimestampInSeconds < firstTimestampInSeconds) {
		lastTimestampInSeconds += 24 * 60 * 60;
	}
	const durationInSeconds = lastTimestampInSeconds - firstTimestampInSeconds;
	return durationInSeconds;
};

export const numberOfTurnsExtractor = (replay: Replay): number => {
	const gameEntityId = replay.replay.find('.//GameEntity').get('id');
	// There is no back and forth in mercenaries
	if (isMercenaries(replay.gameType)) {
		const allTurnChanges = replay.replay.findall(
			`.//TagChange[@tag='${GameTag.STEP}'][@value='${Step.MAIN_PRE_ACTION}']`,
		);
		return allTurnChanges.length;
	} else {
		const allTurnChanges = replay.replay.findall(`.//TagChange[@tag='${GameTag.TURN}'][@entity='${gameEntityId}']`);
		const lastTurn = allTurnChanges.length > 0 ? allTurnChanges[allTurnChanges.length - 1] : null;
		const totalTurns = lastTurn ? parseInt(lastTurn.get('value')) : 0;
		// There is no back and forth in mercenaries
		return Math.ceil(totalTurns / 2);
	}
};

const toTimestamp = (ts: string): number => {
	const split = ts.split(':');
	const total = parseInt(split[0]) * 3600 + parseInt(split[1]) * 60 + parseInt(split[2].split('.')[0]);
	return total;
};

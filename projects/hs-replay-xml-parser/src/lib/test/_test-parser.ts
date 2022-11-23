import { AllCardsService } from '@firestone-hs/reference-data';
import { parseHsReplayString } from '../xml-parser';
import { xml } from './merc-solo-pvp.xml';

const test = async () => {
	const allCards = new AllCardsService();
	await allCards.initializeCardsDb();
	// const stats = parseBattlegroundsGame(xml, null, null, null);
	// console.log('stats', stats);
	const replay = parseHsReplayString(xml, allCards);
	console.log('replay', replay.mainPlayerId, replay.mainPlayerEntityId, replay.result, replay.mainPlayerName);
};
test();

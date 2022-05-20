import { AllCardsService } from '@firestone-hs/reference-data';
import { parseHsReplayString } from '../xml-parser';
import { xml } from './bg-game.xml';

const test = async () => {
	const allCards = new AllCardsService();
	await allCards.initializeCardsDb('oerijgoeiryjrjgireuhjgiozuerhg');
	// const stats = parseBattlegroundsGame(xml, null, null, null);
	// console.log('stats', stats);
	const replay = parseHsReplayString(xml, allCards);
	console.log('replay', replay.additionalResult);
};
test();

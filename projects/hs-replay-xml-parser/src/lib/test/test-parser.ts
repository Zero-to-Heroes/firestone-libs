import { AllCardsService } from '@firestone-hs/reference-data';
import { parseBattlegroundsGame } from '../xml-parser';
import { xml } from './bg-game.xml';

const test = async () => {
	const allCards = new AllCardsService();
	await allCards.initializeCardsDb('oerijgoeiryjrjgireuhjgiozuerhg');
	const replay = parseBattlegroundsGame(xml, null, null, null);
	console.log('replay', replay);
};
test();

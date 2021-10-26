import { AllCardsService } from '@firestone-hs/reference-data';
import { parseHsReplayString } from '../xml-parser';
import { xml } from './merc-solo-pvp.xml';

const test = async () => {
	const allCards = new AllCardsService();
	allCards.initializeCardsDb('oerijgoeirjg');
	const replay = parseHsReplayString(xml, allCards);
	console.log('replay', replay);
};
test();

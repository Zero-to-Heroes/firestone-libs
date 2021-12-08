import { AllCardsService } from '@firestone-hs/reference-data';
import { parseHsReplayString } from '../xml-parser';
import { xml } from './maestra.xml';

const test = async () => {
	const allCards = new AllCardsService();
	await allCards.initializeCardsDb('oerijgoeiryjrjg');
	const replay = parseHsReplayString(xml, allCards);
	console.log('replay', replay);
};
test();

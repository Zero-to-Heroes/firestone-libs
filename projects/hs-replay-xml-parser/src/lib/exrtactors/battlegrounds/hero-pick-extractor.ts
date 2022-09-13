import { CardType, GameTag, Zone } from '@firestone-hs/reference-data';
import { Element, ElementTree } from 'elementtree';

export const heroPickExtractor = (elementTree: ElementTree, mainPlayerId: number): [readonly Element[], Element] => {
	const pickOptions = elementTree
		.findall(`.//FullEntity`)
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.HERO}']`))
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${mainPlayerId}']`))
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.ZONE}'][@value='${Zone.HAND}']`))
		.filter(entity => (
			entity.find(`.Tag[@tag='${GameTag.BACON_HERO_CAN_BE_DRAFTED}'][@value='1']`)
			|| entity.find(`.Tag[@tag='${GameTag.BACON_SKIN}'][@value='1']`))
		);
	const pickOptionIds = pickOptions.map(option => option?.get('id')) ?? [];
	// console.log('pickOptionIds', pickOptionIds);
	const pickedHero = elementTree
		.findall(`.//ChosenEntities`)
		.filter(chosenEntities => {
			const choice = chosenEntities.find('.//Choice');
			if (!choice) {
				console.warn('could not find choice', JSON.stringify(chosenEntities));
				return false;
			}
			return pickOptionIds.indexOf(choice?.get('entity')) !== -1;
		})
		.map(entity => entity.find(`.//Choice`));
	// console.log('pickedHero', pickedHero);
	const pickedHeroEntityId = pickedHero[0]?.get('entity') ?? -1;
	const pickedHeroFullEntity = pickOptions.find(option => option?.get('id') === pickedHeroEntityId);

	return [pickOptions, pickedHeroFullEntity];
};

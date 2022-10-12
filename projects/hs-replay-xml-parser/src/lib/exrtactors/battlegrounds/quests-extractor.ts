import { AllCardsService, BlockType, CardType, GameTag, Zone } from "@firestone-hs/reference-data";
import { ElementTree } from "elementtree";
import { BgsHeroQuest } from "../../model/replay";

export const extractHasBgsQuests = (elementTree: ElementTree): boolean => {
	return elementTree.find('.//GameEntity').find(`.//Tag[@tag='${GameTag.BACON_QUESTS_ACTIVE}']`)?.get('value') === '1';
}


export const extractHeroQuests = (elementTree: ElementTree, mainPlayerId: number, allCards: AllCardsService): readonly BgsHeroQuest[] => {
    // TODO: Sire D.
	const questOptions = elementTree
		.findall(`.//FullEntity`)
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.SPELL}']`))
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${mainPlayerId}']`))
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.ZONE}'][@value='${Zone.SETASIDE}']`))
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.QUEST}'][@value='1']`)
	);
	// console.log('questOptions', questOptions);
	const questOptionIds = questOptions.map(option => option?.get('id')) ?? [];
	// console.log('questOptionIds', questOptionIds);
	const pickedQuest = elementTree
		.findall(`.//ChosenEntities`)
		.filter(chosenEntities => {
			const choice = chosenEntities.find('.//Choice');
			if (!choice) {
				console.warn('could not find choice', JSON.stringify(chosenEntities));
				return false;
			}
			return questOptionIds.indexOf(choice?.get('entity')) !== -1;
		})
		.map(entity => entity.find(`.//Choice`));
	// console.log('pickedQuest', pickedQuest);
	const pickedQuestEntityId = pickedQuest[0]?.get('entity') ?? -1;
	// console.log('pickedQuestEntityId', pickedQuestEntityId);
	const pickedQuestFullEntity = questOptions.find(option => option?.get('id') === pickedQuestEntityId);
	// console.log('pickedQuestFullEntity', pickedQuestFullEntity);
    const questCardId = pickedQuestFullEntity?.get('cardID');
    if (!questCardId?.length) {
        return [];
    }
    const questDifficulty = +elementTree
        .find(`.//TagChange[@tag='${GameTag.QUEST_PROGRESS_TOTAL}'][@entity='${pickedQuestEntityId}']`)
        ?.get('value');
    // console.log('questCardId=', questCardId, 'questDifficulty=', questDifficulty);

    const questRewardDbfId = +elementTree
        .find(`.//TagChange[@tag='${GameTag.QUEST_REWARD_DATABASE_ID}'][@entity='${pickedQuestEntityId}']`)
        ?.get('value');
    const questRewardCardId = allCards.getCardFromDbfId(questRewardDbfId).id;
    // console.log('questRewardCardId=', questRewardCardId);

    const turnsCompletedElements = elementTree
        .findall(`.//TagChange[@tag='${GameTag.NUM_TURNS_IN_PLAY}'][@entity='${pickedQuestEntityId}']`)
        .filter(el => el.get('value') !== '0');
    // console.log('els', turnsCompletedElements);
    const turnsCompleted = !!turnsCompletedElements?.length 
        ? +turnsCompletedElements[turnsCompletedElements.length - 1]?.get('value')
        : null;
    const isCompleted = !!elementTree.find(`.//Block[@type='${BlockType.TRIGGER}'][@entity='${pickedQuestEntityId}']`);

    // console.log('turnsCompleted=', turnsCompleted);
    // console.log('isCompleted=', isCompleted);
    return [
        {
            questCardId: questCardId,
            questDifficulty: questDifficulty,
            rewardCardId: questRewardCardId,
            turnCompleted: turnsCompleted,
            isCompleted: isCompleted,
        }
    ];

}
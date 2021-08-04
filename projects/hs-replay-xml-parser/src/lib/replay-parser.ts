import { AllCardsService, BnetRegion, CardIds, CardType, GameTag, GameType, PlayState, Zone } from '@firestone-hs/reference-data';
import bigInt from 'big-integer';
import { Element, ElementTree, parse } from 'elementtree';
import { heroPickExtractor } from './exrtactors/battlegrounds/hero-pick-extractor';
import { Replay } from './model/replay';

export const buildReplayFromXml = (replayString: string, allCards: AllCardsService = null): Replay => {
	if (!replayString || replayString.length === 0) {
		console.log('no replay string');
		return null;
	}
	// http://effbot.org/zone/element-xpath.htm
	// http://effbot.org/zone/pythondoc-elementtree-ElementTree.htm
	// console.log('preparing to create element tree');
	const elementTree = parse(replayString);
	// console.log('elementTree');

	const mainPlayerElement =
		elementTree.findall('.//Player').find(player => player.get('isMainPlayer') === 'true') ||
		elementTree.findall('.//Player')[0]; // Should never happen, but a fallback just in case
	const mainPlayerId = parseInt(mainPlayerElement.get('playerID'));
	const mainPlayerName = mainPlayerElement.get('name');
	const mainPlayerEntityId = mainPlayerElement.get('id');
	const mainPlayerCardId = extractPlayerCardId(mainPlayerElement, mainPlayerEntityId, elementTree, allCards);
	const region: BnetRegion = bigInt(parseInt(mainPlayerElement.get('accountHi')))
		.shiftRight(32)
		.and(0xff)
		.toJSNumber();
	// console.log('mainPlayer');

	const opponentPlayerElement =
		elementTree.findall('.//Player').find(player => player.get('isMainPlayer') === 'false') ||
		elementTree.findall('.//Player')[1];
	const opponentPlayerId = parseInt(opponentPlayerElement.get('playerID'));
	const opponentPlayerName = opponentPlayerElement.get('name');
	const opponentPlayerEntityId = opponentPlayerElement.get('id');
	const opponentPlayerCardId = extractPlayerCardId(
		opponentPlayerElement,
		opponentPlayerEntityId,
		elementTree,
		allCards,
	);
	// console.log('opponentPlayer');

	const gameFormat = parseInt(elementTree.find('Game').get('formatType'));
	const gameMode = parseInt(elementTree.find('Game').get('gameType'));
	const scenarioId = parseInt(elementTree.find('Game').get('scenarioID'));

	const result = extractResult(mainPlayerEntityId, elementTree);
	// console.log('result');
	const additionalResult =
		gameMode === GameType.GT_BATTLEGROUNDS || gameMode === GameType.GT_BATTLEGROUNDS_FRIENDLY
			? '' + extractBgsAdditionalResult(mainPlayerId, mainPlayerCardId, opponentPlayerId, elementTree)
			: null;
	// console.log('bgsResult');
	const playCoin = extarctPlayCoin(mainPlayerEntityId, elementTree);

	return Object.assign(new Replay(), {
		replay: elementTree,
		mainPlayerId: mainPlayerId,
		mainPlayerName: mainPlayerName,
		mainPlayerCardId: mainPlayerCardId,
		opponentPlayerId: opponentPlayerId,
		opponentPlayerName: opponentPlayerName,
		opponentPlayerCardId: opponentPlayerCardId,
		region: region,
		gameFormat: gameFormat,
		gameType: gameMode,
		scenarioId: scenarioId,
		result: result,
		additionalResult: additionalResult,
		playCoin: playCoin,
	} as Replay);
};

const extractPlayerCardId = (
	playerElement: Element,
	playerEntityId: string,
	elementTree: ElementTree,
	allCards: AllCardsService = null,
): string => {
	const heroEntityId = playerElement.find(`.//Tag[@tag='${GameTag.HERO_ENTITY}']`).get('value');
	const heroEntity = elementTree.find(`.//FullEntity[@id='${heroEntityId}']`);
	let cardId = heroEntity.get('cardID');
	// Battlegrounds assigns TB_BaconShop_HERO_PH at the start and then changes to the real hero
	if (cardId === 'TB_BaconShop_HERO_PH') {
		const tagChanges = elementTree
			.findall(`.//TagChange[@tag='${GameTag.HERO_ENTITY}'][@entity='${playerEntityId}']`)
			.map(tag => tag.get('value'));
		const pickedPlayedHero = tagChanges && tagChanges.length > 0 ? tagChanges[0] : null;
		const newHero = elementTree.findall(`.//FullEntity[@id='${pickedPlayedHero}']`)[0];
		cardId = newHero.get('cardID');
	}

	if (allCards) {
		const heroCreatorDbfId =heroEntity.find(`.Tag[@tag='${GameTag.CREATOR_DBID}']`);
		if (heroCreatorDbfId && +heroCreatorDbfId.get('value') === allCards.getCard(CardIds.Collectible.Rogue.MaestraOfTheMasquerade).dbfId) {
			const heroControllerId = heroEntity.find(`.Tag[@tag='${GameTag.CONTROLLER}']`).get('value');
			const heroRevealed = elementTree
				.findall(`.//FullEntity`)
				// Hero revealed
				.filter(entity => entity.get(`cardID`)?.startsWith('HERO_03'))
				.filter(entity => entity.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.HERO}']`))
				.filter(entity => entity.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${heroControllerId}']`));
			// console.log('heroRevealed', heroRevealed);
			if (heroRevealed.length > 0) {
				cardId = heroRevealed[heroRevealed.length - 1].get('cardID');
			} else {
				cardId = CardIds.Collectible.Rogue.ValeeraSanguinarHeroSkins;
			}
		}
	}	

	// if (allCards) {
	// 	// That process is a bit heavy, but since it's only for the player class, this should be ok
	// 	const heroControllerId = heroEntity.find(`.Tag[@tag='${GameTag.CONTROLLER}']`).get('value');
	// 	const firstNonCreatedNonNeutralRevealedEntity = elementTree
	// 		.findall(`.//ShowEntity`)
	// 		.filter(entity => !entity.find(`.Tag[@tag='${GameTag.CREATOR}']`))
	// 		.filter(entity => !entity.find(`.Tag[@tag='${GameTag.CREATOR_DBID}']`))
	// 		.filter(entity => !entity.find(`.Tag[@tag='${GameTag.DISPLAYED_CREATOR}']`))
	// 		.filter(entity => entity.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${heroControllerId}']`))
	// 		.map(entity => entity.get('cardID'))
	// 		.filter(cardId => !!cardId)
	// 		.map(cardId => allCards.getCard(cardId))
	// 		.find(card => card.playerClass !== 'Neutral');
	// 	const heroClass = allCards.getCard(cardId)?.playerClass;
	// 	if (firstNonCreatedNonNeutralRevealedEntity?.playerClass && heroClass !== firstNonCreatedNonNeutralRevealedEntity?.playerClass) {
	// 		console.log('first card played class does not match hero class, Maestra?', firstNonCreatedNonNeutralRevealedEntity.playerClass, cardId);
	// 		if (firstNonCreatedNonNeutralRevealedEntity.playerClass === 'Rogue') {
	// 			// console.log('heroControllerId', heroControllerId);
	// 			// For Maestra
	// 			const heroRevealed = elementTree
	// 				.findall(`.//FullEntity`)
	// 				// Hero revealed
	// 				.filter(entity => entity.get(`cardID`)?.startsWith('HERO_03'))
	// 				.filter(entity => entity.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.HERO}']`))
	// 				.filter(entity => entity.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${heroControllerId}']`));
	// 			// console.log('heroRevealed', heroRevealed);
	// 			if (heroRevealed.length > 0) {
	// 				cardId = heroRevealed[heroRevealed.length - 1].get('cardID');
	// 			}
	// 		}
	// 	}
	// }	
	
	return cardId;
};

const extractResult = (mainPlayerEntityId: string, elementTree: ElementTree): string => {
	const winChange = elementTree.find(`.//TagChange[@tag='${GameTag.PLAYSTATE}'][@value='${PlayState.WON}']`);
	if (!winChange) {
		const tieChange = elementTree.find(`.//TagChange[@tag='${GameTag.PLAYSTATE}'][@value='${PlayState.TIED}']`);
		return tieChange ? 'tied' : 'unknown';
	}
	return mainPlayerEntityId === winChange.get('entity') ? 'won' : 'lost';
};

const extarctPlayCoin = (mainPlayerEntityId: string, elementTree: ElementTree): string => {
	const firstPlayerTags = elementTree.findall(`.//TagChange[@tag='${GameTag.FIRST_PLAYER}'][@value='1']`);
	return firstPlayerTags && firstPlayerTags.length > 0 && firstPlayerTags[0].get('entity') === mainPlayerEntityId
		? 'play'
		: 'coin';
};

const extractBgsAdditionalResult = (
	mainPlayerId: number,
	mainPlayerCardId: string,
	opponentPlayerId: number,
	elementTree: ElementTree,
): number => {
	const playerEntities = extractPlayerEntities(mainPlayerId, elementTree, true);
	const entityIds = playerEntities.map(entity => entity.get('id'));
	// console.log('player entity ids', entityIds);
	let leaderboardTags = elementTree
		.findall(`.//TagChange[@tag='${GameTag.PLAYER_LEADERBOARD_PLACE}']`)
		.filter(tag => entityIds.indexOf(tag.get('entity')) !== -1)
		.map(tag => parseInt(tag.get('value')))
		.filter(value => value > 0);
	// console.log('leaderboard tag changes', leaderboardTags);
	// No tag change, look at root tag
	if (!leaderboardTags || leaderboardTags.length === 0) {
		// console.log('no tag change, looking at root');
		leaderboardTags = playerEntities
			.map(entity => entity.find(`.Tag[@tag='${GameTag.PLAYER_LEADERBOARD_PLACE}']`))
			.filter(tag => tag)
			.map(tag => parseInt(tag.get('value')))
			.filter(value => value > 0);
		// console.log('leaderboard tag changes at root', leaderboardTags);
	}
	return !leaderboardTags || leaderboardTags.length === 0 ? 0 : leaderboardTags[leaderboardTags.length - 1];
};

export const extractPlayerEntities = (playerId: number, elementTree: ElementTree, isMainPlayer: boolean): Element[] => {
	const [pickOptions, pickedHeroFullEntity] = isMainPlayer ? heroPickExtractor(elementTree, playerId) : [[], null];

	// The heroes that were discarded in the hero selection phase (if any)
	const invalidCardIds: readonly string[] = pickedHeroFullEntity
		? pickOptions
				.map(option => option.get('cardID'))
				.filter(cardId => cardId !== pickedHeroFullEntity.get('cardID'))
		: [];

	return elementTree
		.findall('.//FullEntity')
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.HERO}']`))
		.filter(entity => entity.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${playerId}']`))
		.filter(
			entity =>
				!isMainPlayer ||
				![Zone.SETASIDE, Zone.GRAVEYARD].includes(
					parseInt(entity.find(`.Tag[@tag='${GameTag.ZONE}']`).get('value')),
				),
		)
		.filter(entity => !invalidCardIds.includes(entity.get('cardID')))
		.filter(
			entity =>
				!['TB_BaconShop_HERO_PH', 'TB_BaconShop_HERO_KelThuzad', 'TB_BaconShopBob'].includes(
					entity.get('cardID'),
				),
		);
};

export const extractAllPlayerEntities = (
	mainPlayerId: number,
	opponentPlayerId: number,
	elementTree: ElementTree,
): Element[] => {
	const mainPlayerEntities = extractPlayerEntities(mainPlayerId, elementTree, true);
	const opponentEntities = extractPlayerEntities(opponentPlayerId, elementTree, false);
	return [...mainPlayerEntities, ...opponentEntities];
};

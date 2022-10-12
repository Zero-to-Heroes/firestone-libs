import { AllCardsService, BnetRegion, CardIds, CardType, GameTag, GameType, PlayState, Zone } from '@firestone-hs/reference-data';
import bigInt from 'big-integer';
import { Element, ElementTree, parse } from 'elementtree';
import { heroPickExtractor } from './exrtactors/battlegrounds/hero-pick-extractor';
import { extractHasBgsQuests, extractHeroQuests } from './exrtactors/battlegrounds/quests-extractor';
import { Replay } from './model/replay';

const INNKEEPER_NAMES = ["The Innkeeper", "Aubergiste", "Gastwirt",
"El tabernero", "Locandiere", "酒場のオヤジ", "여관주인",  "Karczmarz", "O Estalajadeiro", "Хозяин таверны",
"เจ้าของโรงแรม", "旅店老板", "旅店老闆"];

export const buildReplayFromXml = (replayString: string, allCards: AllCardsService): Replay => {
	if (!replayString || replayString.length === 0) {
		console.log('no replay string');
		return null;
	}
	// http://effbot.org/zone/element-xpath.htm
	// http://effbot.org/zone/pythondoc-elementtree-ElementTree.htm
	// console.log('preparing to create element tree');
	const elementTree = parse(replayString);
	// console.log('elementTree');

	let mainPlayerElement =
		elementTree.findall('.//Player').find(player => player.get('isMainPlayer') === 'true');
	// Can happen in case of reconnects
	if (!mainPlayerElement) {
		// Find out known cards in hand, they must belong to the player
		const allFullEntitiesOnGameElement = elementTree.find('.Game').findall('.FullEntity');
		for (const entity of allFullEntitiesOnGameElement) {
			const cardId = entity.get('cardID');
			const inHand = entity.find(`.Tag[@tag='${GameTag.ZONE}'][@value='${Zone.HAND}']`);
			if (inHand && !!cardId) {
				const controllerId = entity.find(`.Tag[@tag='${GameTag.CONTROLLER}']`).get('value');
				mainPlayerElement = elementTree.findall('.//Player').find(player => player.get('playerID') === controllerId);
				break;
			}
		}
	}	
	// Reconnect happened without any card in hand
	if (!mainPlayerElement) {
		// No idea how to handle this
	}
	if (!mainPlayerElement) {
		mainPlayerElement = elementTree.findall('.//Player')[0]; // Should never happen, but a fallback just in case
	}
	const mainPlayerId = parseInt(mainPlayerElement.get('playerID'));
	const mainPlayerName = mainPlayerElement.get('name');
	const mainPlayerEntityId = mainPlayerElement.get('id');
	// console.debug('main player', mainPlayerId, mainPlayerName, mainPlayerEntityId);
	const mainPlayerCardId = extractPlayerCardId(mainPlayerElement, mainPlayerEntityId, elementTree, allCards);
	const region: BnetRegion = bigInt(parseInt(mainPlayerElement.get('accountHi')))
		.shiftRight(32)
		.and(0xff)
		.toJSNumber();
	// console.log('mainPlayer');

	const opponentCandidates = elementTree.findall(`.//Player[@isMainPlayer="false"]`).filter(entity => parseInt(entity.get('playerID')) !== mainPlayerId);
	const opponentPlayerElement = [...opponentCandidates].pop();
	const opponentPlayerId = parseInt(opponentPlayerElement.get('playerID'));
	const opponentPlayerEntityId = opponentPlayerElement.get('id');
	const opponentPlayerCardId = extractPlayerCardId(
		opponentPlayerElement,
		opponentPlayerEntityId,
		elementTree,
		allCards,
	);
	// In short, this is a mess. When playing against a human, there are two players, one being an "AI" of sort, 
	// and the other being the actual player
	const humanPlayerOpponentCandidates = opponentCandidates
		.filter(opponent => opponent.get('name') !== 'UNKNOWN HUMAN PLAYER')
		.filter(opponent => !INNKEEPER_NAMES.includes(opponent.get('name')));
	const opponentPlayerElementForName = opponentCandidates.length === 1 
		? opponentCandidates[0] 
		: humanPlayerOpponentCandidates.length > 0 
		? humanPlayerOpponentCandidates[0] 
		: [...opponentCandidates].pop();	
	const opponentPlayerName = opponentPlayerElementForName.get('name');
	// console.log('opponentPlayerName', opponentPlayerName, mainPlayerElement, humanPlayerOpponentCandidates);
	// console.log('opponentPlayer');

	const gameFormat = parseInt(elementTree.find('Game').get('formatType'));
	const gameMode = parseInt(elementTree.find('Game').get('gameType'));
	const scenarioId = parseInt(elementTree.find('Game').get('scenarioID'));

	const result = extractResult(mainPlayerEntityId, elementTree);
	// console.log('result');
	const isBgGame = gameMode === GameType.GT_BATTLEGROUNDS || gameMode === GameType.GT_BATTLEGROUNDS_FRIENDLY;
	const additionalResult =
		isBgGame		
			? '' + extractBgsAdditionalResult(mainPlayerId, mainPlayerCardId, opponentPlayerId, elementTree)
			: null;
	// console.log('bgsResult');
	const playCoin = extarctPlayCoin(mainPlayerEntityId, elementTree);

	// BG-specific stuff
	const hasBgsQuests = isBgGame ? extractHasBgsQuests(elementTree) : null;
	const bgsHeroQuests = isBgGame && hasBgsQuests ? extractHeroQuests(elementTree, mainPlayerId, allCards) : null;

	return Object.assign(new Replay(), {
		replay: elementTree,
		mainPlayerId: mainPlayerId,
		mainPlayerEntityId: +mainPlayerEntityId,
		mainPlayerName: mainPlayerName,
		mainPlayerCardId: mainPlayerCardId,
		opponentPlayerId: opponentPlayerId,
		opponentPlayerEntityId: +opponentPlayerEntityId,
		opponentPlayerName: opponentPlayerName,
		opponentPlayerCardId: opponentPlayerCardId,
		region: region,
		gameFormat: gameFormat,
		gameType: gameMode,
		scenarioId: scenarioId,
		result: result,
		additionalResult: additionalResult,
		playCoin: playCoin,
		hasBgsQuests: hasBgsQuests,
		bgsHeroQuests: bgsHeroQuests,
	} as Replay);
};

const extractPlayerCardId = (
	playerElement: Element,
	playerEntityId: string,
	elementTree: ElementTree,
	allCards: AllCardsService = null,
): string => {
	const heroEntityId = playerElement.find(`.//Tag[@tag='${GameTag.HERO_ENTITY}']`)?.get('value');
	// Mercenaries don't have a hero entity id
	if (!heroEntityId) {
		return null;
	}
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
		// Handle Maestra
		const disguiseDbfId = allCards.getCard(CardIds.MaestraOfTheMasquerade_DisguiseEnchantment).dbfId;
		const heroControllerId = heroEntity.find(`.Tag[@tag='${GameTag.CONTROLLER}']`).get('value');
		const heroRevealed = elementTree
			.findall(`.//FullEntity`)
			.filter(entity => entity.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.HERO}']`))
			.filter(entity => entity.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${heroControllerId}']`))
			.filter(entity => entity.find(`.Tag[@tag='${GameTag.CREATOR_DBID}'][@value='${disguiseDbfId}']`));
		if (heroRevealed.length > 0) {
			cardId = heroRevealed[heroRevealed.length - 1].get('cardID');
		}
		// else {
		// 	cardId = CardIds.ValeeraSanguinarHeroSkins;
		// }
	}
	
	return cardId;
};

const extractResult = (mainPlayerEntityId: string, elementTree: ElementTree): string => {
	const winChanges = elementTree.findall(`.//TagChange[@tag='${GameTag.PLAYSTATE}'][@value='${PlayState.WON}']`);
	if (!!winChanges?.length) {
		// Because mercenaries introduce another player that mimics the main player, but with another 
		// entity ID, we need to look at all the tags
		return winChanges.some(winChange =>  mainPlayerEntityId === winChange.get('entity')) ? 'won' : 'lost';
	}
	
	// For some reason when conceding (early?) in mercs, the WON state never shows up
	const winningChanges = elementTree.findall(`.//TagChange[@tag='${GameTag.PLAYSTATE}'][@value='${PlayState.WINNING}']`);
	if (!!winningChanges?.length) {
		return winningChanges.some(winChange =>  mainPlayerEntityId === winChange.get('entity')) ? 'won' : 'lost';
	}

	// Same comment with LOSE / LOSING
	const loseChanges = elementTree.findall(`.//TagChange[@tag='${GameTag.PLAYSTATE}'][@value='${PlayState.LOST}']`);
	if (!!loseChanges?.length) {
		return loseChanges.some(winChange =>  mainPlayerEntityId === winChange.get('entity')) ? 'lost' : 'won';
	}
	const losingChanges = elementTree.findall(`.//TagChange[@tag='${GameTag.PLAYSTATE}'][@value='${PlayState.LOSING}']`);
	if (!!losingChanges?.length) {
		return losingChanges.some(winChange =>  mainPlayerEntityId === winChange.get('entity')) ? 'lost' : 'won';
	}
	
	const tieChange = elementTree.find(`.//TagChange[@tag='${GameTag.PLAYSTATE}'][@value='${PlayState.TIED}']`);
	return tieChange ? 'tied' : 'unknown';
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
	// console.log('mainPlayerId', mainPlayerId);
	const playerEntities = extractPlayerEntities(mainPlayerId, elementTree, true);
	// console.log('playerEntities', playerEntities);
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

/* eslint-disable @typescript-eslint/no-use-before-define */
import { BlockType, CardType, GameTag, MetaTags, PlayState, Step, Zone } from '@firestone-hs/reference-data';
import { Element } from 'elementtree';
import { Map } from 'immutable';
import { BooleanTurnInfo } from '../../model/boolean-turn-info';
import { NumericTurnInfo } from '../../model/numeric-turn-info';
import { Replay } from '../../model/replay';
import { extractNumberOfKilledEnemyHeroes, extractTotalDamageDealtToEnemyHero, extractTotalMinionDeaths } from '../../xml-parser';
import { ParsingStructure } from './parsing-structure';

export const reparseReplay = (
	replay: Replay,
): {
	rerollsOverTurn: readonly NumericTurnInfo[];
	freezesOverTurn: readonly NumericTurnInfo[];
	coinsWastedOverTurn: readonly NumericTurnInfo[];
	minionsBoughtOverTurn: readonly NumericTurnInfo[];
	minionsSoldOverTurn: readonly NumericTurnInfo[];
	mainPlayerHeroPowersOverTurn: readonly NumericTurnInfo[];
	wentFirstInBattleOverTurn: readonly BooleanTurnInfo[];
	hpOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] };
	totalStatsOverTurn: readonly NumericTurnInfo[];
	totalMinionsDamageDealt: { [cardId: string]: number };
	totalMinionsDamageTaken: { [cardId: string]: number };
	totalDamageDealtToEnemyHeroes: number;
	totalEnemyMinionsKilled: number;
	totalEnemyHeroesKilled: number;
} => {
	const opponentPlayerElement = replay.replay
		.findall('.//Player')
		.find(player => player.get('isMainPlayer') === 'false');
	const opponentPlayerEntityId = opponentPlayerElement.get('id');
	// console.log('mainPlayerEntityId', opponentPlayerEntityId);
	const structure: ParsingStructure = {
		currentTurn: 0,
		boardOverTurn: Map.of(),
		rerollOverTurn: Map.of(),
		freezeOverTurn: Map.of(),
		wentFirstInBattleOverTurn: Map.of(),
		mainPlayerHeroPowerOverTurn: Map.of(),
		coinsWastedOverTurn: Map.of(),
		minionsBoughtOverTurn: Map.of(),
		minionsSoldOverTurn: Map.of(),
		hpOverTurn: {},
		leaderboardPositionOverTurn: {},
		totalStatsOverTurn: Map.of(),
		entities: {},
		mainEnchantEntityIds: [],
		mainPlayerHeroPowerIds: [],
		mainPlayerHeroPowersForTurn: 0,
		rerollsForTurn: 0,
		rerollsIds: [],
		wentFirstInBattleThisTurn: undefined,
		freezesForTurn: 0,
		freezesIds: [],
		resourcesForTurn: 0,
		resourcesUsedForTurn: 0,
		playerHps: {},
		leaderboardPositions: {},
		minionsSoldForTurn: 0,
		minionsSoldIds: [],
		minionsBoughtForTurn: 0,
		minionsBoughtIds: [],
		minionsDamageDealt: {},
		minionsDamageReceived: {},
	};

	const playerEntities = replay.replay
		.findall(`.//FullEntity`)
		.filter(fullEntity => fullEntity.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.HERO}']`))
		.filter(fullEntity => {
			const controllerId = parseInt(fullEntity.find(`.Tag[@tag='${GameTag.CONTROLLER}']`).get('value'));
			return controllerId === replay.mainPlayerId || controllerId === replay.opponentPlayerId;
		})
		.filter(
			fullEntity =>
				['TB_BaconShop_HERO_PH', 'TB_BaconShop_HERO_KelThuzad', 'TB_BaconShopBob'].indexOf(
					fullEntity.get('cardID'),
				) === -1,
		);
	const mainPlayerEntityId: string = replay.replay.find('.//Player[@isMainPlayer="true"]').get('id');
	console.debug('mainPlayerEntityId', mainPlayerEntityId);
	const playerCardIds: readonly string[] = [
		...new Set(playerEntities.map(entity => entity.get('cardID'))),
	] as readonly string[];
	for (const playerCardId of playerCardIds) {
		structure.playerHps[playerCardId] = playerCardId === 'TB_BaconShop_HERO_34' ? 50 : 40;
	}
	console.log('mainPlayerId', replay.mainPlayerId);

	parseElement(
		replay.replay.getroot(),
		replay.mainPlayerId,
		opponentPlayerEntityId,
		null,
		{ currentTurn: 0 },
		[
			compositionForTurnParse(structure),
			rerollsForTurnParse(structure),
			freezesForTurnParse(structure),
			mainPlayerHeroPowerForTurnParse(structure, replay.mainPlayerId),
			coinsWastedForTurnParse(structure, mainPlayerEntityId),
			minionsSoldForTurnParse(structure),
			minionsBoughtForTurnParse(structure),
			hpForTurnParse(structure, playerEntities),
			leaderboardForTurnParse(structure, playerEntities),
			damageDealtByMinionsParse(structure, replay),
			wentFirstInBattleForTurnParse(structure, replay.mainPlayerId),
		],
		[
			compositionForTurnPopulate(structure, replay),
			rerollsForTurnPopulate(structure, replay),
			freezesForTurnPopulate(structure, replay),
			mainPlayerHeroPowerForTurnPopulate(structure, replay),
			coinsWastedForTurnPopulate(structure, replay),
			minionsSoldForTurnPopulate(structure, replay),
			minionsBoughtForTurnPopulate(structure, replay),
			// Order is important, because we want to first populate the leaderboard (for which it's easy
			// to filter out the mulligan choices) and use this to iterate on the other elements
			leaderboardForTurnPopulate(structure, replay),
			hpForTurnPopulate(structure, replay),
			totalStatsForTurnPopulate(structure, replay),
			wentFirstInBattleForTurnPopulate(structure, replay),
		],
	);

	// const compositionsOverTurn: readonly BgsCompositionForTurn[] = structure.boardOverTurn
	// 	.map((cards: any[], turn: number) => {
	// 		return {
	// 			turn: turn,
	// 			beast: cards.filter(card => card.tribe === Race.BEAST).length,
	// 			demon: cards.filter(card => card.tribe === Race.DEMON).length,
	// 			dragon: cards.filter(card => card.tribe === Race.DRAGON).length,
	// 			mech: cards.filter(card => card.tribe === Race.MECHANICAL).length,
	// 			murloc: cards.filter(card => card.tribe === Race.MURLOC).length,
	// 			blank: cards.filter(card => card.tribe === Race.BLANK || card.tribe === -1).length,
	// 		} as BgsCompositionForTurn;
	// 	})
	// 	.valueSeq()
	// 	.toArray();
	const rerollsOverTurn: readonly NumericTurnInfo[] = structure.rerollOverTurn
		.map(
			(rerolls, turn: number) =>
				({
					turn: turn,
					value: rerolls,
				} as NumericTurnInfo),
		)
		.valueSeq()
		.toArray();
	const freezesOverTurn: readonly NumericTurnInfo[] = structure.freezeOverTurn
		.map(
			(freezes, turn: number) =>
				({
					turn: turn,
					value: freezes,
				} as NumericTurnInfo),
		)
		.valueSeq()
		.toArray();
	const mainPlayerHeroPowersOverTurn: readonly NumericTurnInfo[] = structure.mainPlayerHeroPowerOverTurn
		.map(
			(heroPower, turn: number) =>
				({
					turn: turn,
					value: heroPower,
				} as NumericTurnInfo),
		)
		.valueSeq()
		.toArray();
	const coinsWastedOverTurn: readonly NumericTurnInfo[] = structure.coinsWastedOverTurn
		.map(
			(waste, turn: number) =>
				({
					turn: turn,
					value: waste,
				} as NumericTurnInfo),
		)
		.valueSeq()
		.toArray();
	const minionsSoldOverTurn: readonly NumericTurnInfo[] = structure.minionsSoldOverTurn
		.map(
			(minions, turn: number) =>
				({
					turn: turn,
					value: minions,
				} as NumericTurnInfo),
		)
		.valueSeq()
		.toArray();
	const wentFirstInBattleOverTurn: readonly BooleanTurnInfo[] = structure.wentFirstInBattleOverTurn
		.map(
			(wentFirst, turn: number) =>
				({
					turn: turn,
					value: wentFirst,
				} as BooleanTurnInfo),
		)
		.valueSeq()
		.toArray();
	const minionsBoughtOverTurn: readonly NumericTurnInfo[] = structure.minionsBoughtOverTurn
		.map(
			(minions, turn: number) =>
				({
					turn: turn,
					value: minions,
				} as NumericTurnInfo),
		)
		.valueSeq()
		.toArray();
	const hpOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] } = structure.hpOverTurn;
	const totalStatsOverTurn: readonly NumericTurnInfo[] = structure.totalStatsOverTurn
		.map((stats: number, turn: number) => {
			return {
				turn: turn,
				value: stats,
			} as NumericTurnInfo;
		})
		.valueSeq()
		.toArray();
	const totalEnemyMinionsKilled = extractTotalMinionDeaths(replay).opponent;
	const totalEnemyHeroesKilled = extractNumberOfKilledEnemyHeroes(replay);
	return {
		// compositionsOverTurn: compositionsOverTurn,
		rerollsOverTurn: rerollsOverTurn,
		freezesOverTurn: freezesOverTurn,
		mainPlayerHeroPowersOverTurn: mainPlayerHeroPowersOverTurn,
		coinsWastedOverTurn: coinsWastedOverTurn,
		minionsSoldOverTurn: minionsSoldOverTurn,
		minionsBoughtOverTurn: minionsBoughtOverTurn,
		hpOverTurn: hpOverTurn,
		totalStatsOverTurn: totalStatsOverTurn,
		totalDamageDealtToEnemyHeroes: extractTotalDamageDealtToEnemyHero(replay).opponent,
		totalMinionsDamageDealt: structure.minionsDamageDealt,
		totalMinionsDamageTaken: structure.minionsDamageReceived,
		totalEnemyMinionsKilled: totalEnemyMinionsKilled,
		totalEnemyHeroesKilled: totalEnemyHeroesKilled,
		wentFirstInBattleOverTurn: wentFirstInBattleOverTurn,
	};
};

const hpForTurnParse = (structure: ParsingStructure, playerEntities: readonly Element[]) => {
	return element => {
		if (
			element.tag === 'TagChange' &&
			parseInt(element.get('value')) > 0 &&
			parseInt(element.get('tag')) === GameTag.DAMAGE &&
			playerEntities.map(entity => entity.get('id')).indexOf(element.get('entity')) !== -1
		) {
			const playerCardId = playerEntities
				.find(entity => entity.get('id') === element.get('entity'))
				.get('cardID');
			structure.playerHps[playerCardId] =
				// Patchwerk is a special case
				Math.max(0, (playerCardId === 'TB_BaconShop_HERO_34' ? 50 : 40) - parseInt(element.get('value')));
		}
	};
};

const leaderboardForTurnParse = (structure: ParsingStructure, playerEntities: readonly Element[]) => {
	return element => {
		if (
			element.tag === 'TagChange' &&
			parseInt(element.get('tag')) === GameTag.PLAYER_LEADERBOARD_PLACE &&
			playerEntities.map(entity => entity.get('id').indexOf(element.get('entity')) !== -1)
		) {
			const playerCardId = playerEntities
				.find(entity => entity.get('id') === element.get('entity'))
				.get('cardID');
			structure.leaderboardPositions[playerCardId] = parseInt(element.get('value'));
		}
	};
};

const rerollsForTurnParse = (structure: ParsingStructure) => {
	return element => {
		if (element.tag === 'FullEntity' && element.get('cardID') === 'TB_BaconShop_8p_Reroll_Button') {
			structure.rerollsIds = [...structure.rerollsIds, element.get('id')];
		}
		if (
			element.tag === 'Block' &&
			parseInt(element.get('type')) === BlockType.POWER &&
			structure.rerollsIds.indexOf(element.get('entity')) !== -1 &&
			element.findall('.FullEntity').length > 0
		) {
			// console.log('adding one reroll', structure.rerollsForTurn, element);
			structure.rerollsForTurn = structure.rerollsForTurn + 1;
		}
	};
};

const coinsWastedForTurnParse = (structure: ParsingStructure, mainPlayerEntityId: string) => {
	return (element: Element) => {
		if (element.tag === 'TagChange' && mainPlayerEntityId === element.get('entity')) {
			if (parseInt(element.get('tag')) === GameTag.RESOURCES) {
				structure.resourcesForTurn = parseInt(element.get('value'));
			} else if (parseInt(element.get('tag')) === GameTag.RESOURCES_USED) {
				structure.resourcesUsedForTurn = parseInt(element.get('value'));
			}
		}
	};
};

const leaderboardForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		for (const playerCardId of Object.keys(structure.leaderboardPositions)) {
			const currentLeaderboards = [...(structure.leaderboardPositionOverTurn[playerCardId] || [])];
			currentLeaderboards.push({
				turn: currentTurn,
				value: structure.leaderboardPositions[playerCardId],
			});
			structure.leaderboardPositionOverTurn[playerCardId] = currentLeaderboards;
		}
	};
};

const hpForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		for (const playerCardId of Object.keys(structure.playerHps)) {
			const currentHps = [...(structure.hpOverTurn[playerCardId] || [])];
			currentHps.push({
				turn: currentTurn,
				value: structure.playerHps[playerCardId],
			});
			structure.hpOverTurn[playerCardId] = currentHps;
		}
	};
};

const rerollsForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		structure.rerollOverTurn = structure.rerollOverTurn.set(currentTurn, structure.rerollsForTurn);
		structure.rerollsForTurn = 0;
	};
};

const mainPlayerHeroPowerForTurnParse = (structure: ParsingStructure, mainPlayerPlayerId: number) => {
	return element => {
		if (
			element.tag === 'FullEntity' &&
			element.find(`.Tag[@tag='${GameTag.CARDTYPE}'][@value='${CardType.HERO_POWER}']`) &&
			element.find(`.Tag[@tag='${GameTag.CONTROLLER}'][@value='${mainPlayerPlayerId}']`)
		) {
			structure.mainPlayerHeroPowerIds = [...structure.mainPlayerHeroPowerIds, element.get('id')];
			// console.debug('mainPlayerHeroPowerIds', structure.mainPlayerHeroPowerIds);
		}
		if (
			element.tag === 'Block' &&
			parseInt(element.get('type')) === BlockType.POWER &&
			structure.mainPlayerHeroPowerIds.indexOf(element.get('entity')) !== -1
		) {
			structure.mainPlayerHeroPowersForTurn = structure.mainPlayerHeroPowersForTurn + 1;
			// console.debug('mainPlayerHeroPowersForTurn', structure.mainPlayerHeroPowersForTurn);
		}
	};
};

const mainPlayerHeroPowerForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		structure.mainPlayerHeroPowerOverTurn = structure.mainPlayerHeroPowerOverTurn.set(
			currentTurn,
			structure.mainPlayerHeroPowersForTurn,
		);
		// console.log(
		// 	'hero power over turn',
		// 	currentTurn,
		// 	structure.mainPlayerHeroPowersForTurn,
		// 	structure.mainPlayerHeroPowerOverTurn.toJS(),
		// );
		structure.mainPlayerHeroPowersForTurn = 0;
	};
};

const freezesForTurnParse = (structure: ParsingStructure) => {
	return element => {
		if (element.tag === 'FullEntity' && element.get('cardID') === 'TB_BaconShopLockAll_Button') {
			structure.freezesIds = [...structure.freezesIds, element.get('id')];
			// console.debug('freezesIds', structure.freezesIds);
		}
		if (
			element.tag === 'Block' &&
			parseInt(element.get('type')) === BlockType.POWER &&
			structure.freezesIds.indexOf(element.get('entity')) !== -1 &&
			element.findall(`.TagChange[@tag='${GameTag.FROZEN}']`).length > 0
		) {
			// console.log('adding one reroll', structure.rerollsForTurn, element);
			structure.freezesForTurn = structure.freezesForTurn + 1;
			// console.debug('freezesForTurn', structure.freezesForTurn);
		}
	};
};

const freezesForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		structure.freezeOverTurn = structure.freezeOverTurn.set(currentTurn, structure.freezesForTurn);
		structure.freezesForTurn = 0;
	};
};

const wentFirstInBattleForTurnParse = (structure: ParsingStructure, mainPlayerPlayerId: number) => {
	return element => {
		if (element.tag === 'FullEntity' && element.get('cardID') === 'TB_BaconShop_8P_PlayerE') {
			structure.mainEnchantEntityIds = [...structure.mainEnchantEntityIds, element.get('id')];
			// console.debug('freezesIds', structure.freezesIds);
		}
		if (
			element.tag === 'Block' &&
			structure.mainEnchantEntityIds.indexOf(element.get('entity')) !== -1 &&
			// element.get('cardID') === 'TB_BaconShop_8P_PlayerE' &&
			parseInt(element.get('type')) == BlockType.TRIGGER &&
			element.find(`.Block[@type='${BlockType.ATTACK}']`)
		) {
			const firstAttack = element.find(`.Block[@type='${BlockType.ATTACK}']`);
			const attackingEntity = structure.entities[firstAttack.get('entity')];
			if (!attackingEntity) {
				console.warn('trying to know who went first in battle without attacking entity', firstAttack.get('entity'));
				return;
			}
			const wentFirst = attackingEntity.controller === mainPlayerPlayerId;
			structure.wentFirstInBattleThisTurn = wentFirst;
			// console.debug('wentFirstInBattleThisTurn', structure.wentFirstInBattleThisTurn);
		}
	};
};

const wentFirstInBattleForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		structure.wentFirstInBattleOverTurn = structure.wentFirstInBattleOverTurn.set(
			currentTurn,
			structure.wentFirstInBattleThisTurn,
		);
		structure.wentFirstInBattleThisTurn = undefined;
	};
};

const coinsWastedForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		const totalResourcesGained = structure.resourcesForTurn + structure.minionsSoldForTurn;
		// console.debug(
		// 	'totalResourcesGained',
		// 	currentTurn,
		// 	totalResourcesGained,
		// 	structure.resourcesForTurn,
		// 	structure.minionsSoldForTurn,
		// 	structure.resourcesUsedForTurn,
		// );
		structure.coinsWastedOverTurn = structure.coinsWastedOverTurn.set(
			currentTurn,
			Math.max(0, totalResourcesGained - structure.resourcesUsedForTurn),
		);
		structure.resourcesForTurn = 0;
		structure.resourcesUsedForTurn = 0;
	};
};

const minionsSoldForTurnParse = (structure: ParsingStructure) => {
	return element => {
		if (element.tag === 'FullEntity' && element.get('cardID') === 'TB_BaconShop_DragSell') {
			structure.minionsSoldIds = [...structure.minionsSoldIds, element.get('id')];
		}
		if (
			element.tag === 'Block' &&
			parseInt(element.get('type')) === BlockType.POWER &&
			structure.minionsSoldIds.indexOf(element.get('entity')) !== -1
		) {
			// console.log('adding one reroll', structure.rerollsForTurn, element);
			structure.minionsSoldForTurn = structure.minionsSoldForTurn + 1;
		}
	};
};

const minionsSoldForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		structure.minionsSoldOverTurn = structure.minionsSoldOverTurn.set(currentTurn, structure.minionsSoldForTurn);
		structure.minionsSoldForTurn = 0;
	};
};

const minionsBoughtForTurnParse = (structure: ParsingStructure) => {
	return element => {
		if (element.tag === 'FullEntity' && element.get('cardID') === 'TB_BaconShop_DragBuy') {
			structure.minionsBoughtIds = [...structure.minionsBoughtIds, element.get('id')];
		}
		if (
			element.tag === 'Block' &&
			parseInt(element.get('type')) === BlockType.POWER &&
			element.find(`.TagChange[@tag='${GameTag.CONTROLLER}']`) &&
			structure.minionsBoughtIds.indexOf(element.get('entity')) !== -1
		) {
			// TODO: here we can add some logic to store which minion has been bought for each turn
			structure.minionsBoughtForTurn = structure.minionsBoughtForTurn + 1;
		}
	};
};

const minionsBoughtForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		structure.minionsBoughtOverTurn = structure.minionsBoughtOverTurn.set(
			currentTurn,
			structure.minionsBoughtForTurn,
		);
		structure.minionsBoughtForTurn = 0;
	};
};

const totalStatsForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		const totalStatsOnBoard = Object.values(structure.entities)
			.filter(entity => entity.controller === replay.mainPlayerId)
			.filter(entity => entity.zone === Zone.PLAY)
			.filter(entity => entity.cardType === CardType.MINION)
			.map(entity => entity.atk + entity.health)
			.reduce((a, b) => a + b, 0);
		structure.totalStatsOverTurn = structure.totalStatsOverTurn.set(currentTurn, totalStatsOnBoard);
	};
};

const damageDealtByMinionsParse = (structure: ParsingStructure, replay: Replay) => {
	return (element: Element) => {
		// For now we only consider damage in attacks / powers, which should cover most cases
		if (element.tag?.toString() === 'Block') {
			const actionEntity = structure.entities[element.get('entity')];
			// Usually happens for Player and Game entities
			if (!actionEntity) {
				return;
			}
			const damageTags = element.findall(`.//MetaData[@meta='${MetaTags.DAMAGE}']`);
			// If it's an attack, the attacker deals to the def, and vice versa
			if ([BlockType.ATTACK].indexOf(parseInt(element.get('type'))) !== -1) {
				const attackerEntityId = element.find(`.//TagChange[@tag='${GameTag.ATTACKING}']`)?.get('entity');
				const defenderEntityId = element.find(`.//TagChange[@tag='${GameTag.DEFENDING}']`)?.get('entity');
				damageTags.forEach(tag => {
					const infos = tag.findall(`.Info`);
					infos.forEach(info => {
						const damagedEntity = structure.entities[info.get('entity')];
						if (!damagedEntity) {
							console.warn('Could not find damaged entity', info.get('entity'), actionEntity);
							return;
						}
						// We are damaged, so add the info
						if (damagedEntity.controller === replay.mainPlayerId) {
							structure.minionsDamageReceived[damagedEntity.cardId] =
								(structure.minionsDamageReceived[damagedEntity.cardId] || 0) +
								parseInt(tag.get('data'));
						}
						// We are not damaged, so the Info represents the opponent's entity
						// First case, we attack so we add the damage to our count
						else if (actionEntity.controller === replay.mainPlayerId) {
							structure.minionsDamageDealt[actionEntity.cardId] =
								(structure.minionsDamageDealt[actionEntity.cardId] || 0) + parseInt(tag.get('data'));
						}
						// Second case, we are attacked so we need to find out who did the damage to the enemy
						else {
							const defenderEntity = structure.entities[defenderEntityId];
							if (!defenderEntity) {
								console.warn('Could not find defenderEntity', defenderEntityId);
								return;
							}
							structure.minionsDamageDealt[defenderEntity.cardId] =
								(structure.minionsDamageDealt[defenderEntity.cardId] || 0) + parseInt(tag.get('data'));
						}
					});
				});
			}
			// Otherwise, it goes one way
			// It can happen that damage it 
			else {
				// We do the damage
				if (actionEntity.controller === replay.mainPlayerId && actionEntity.cardType === CardType.MINION) {
					const newDamage = damageTags.map(tag => parseInt(tag.get('data'))).reduce((a, b) => a + b, 0);
					structure.minionsDamageDealt[actionEntity.cardId] =
						(structure.minionsDamageDealt[actionEntity.cardId] || 0) + newDamage;
				}
				// Damage is done to us
				else if (actionEntity.controller !== replay.mainPlayerId && actionEntity.cardType === CardType.MINION) {
					damageTags.forEach(tag => {
						const infos = tag.findall(`.Info`);
						infos.forEach(info => {
							const damagedEntity = structure.entities[info.get('entity')];
							if (!damagedEntity) {
								console.warn('Could not find damaged entity', info.get('entity'), actionEntity);
								return;
							}
							// if (damagedEntity.cardId === 'BGS_038') {
							// 	console.log('handling damage done to us', tag, element);
							// }
							if (
								damagedEntity.controller === replay.mainPlayerId &&
								damagedEntity.cardType === CardType.MINION
							) {
								structure.minionsDamageReceived[damagedEntity.cardId] =
									(structure.minionsDamageReceived[damagedEntity.cardId] || 0) +
									parseInt(tag.get('data'));
							}
						});
					});
				}
			}
		}
	};
};

// While we don't use the metric, the entity info that is populated is useful for other extractors
const compositionForTurnParse = (structure: ParsingStructure) => {
	return element => {
		if (element.tag === 'FullEntity') {
			structure.entities[element.get('id')] = {
				cardId: element.get('cardID'),
				controller: parseInt(element.find(`.Tag[@tag='${GameTag.CONTROLLER}']`)?.get('value') || '-1'),
				zone: parseInt(element.find(`.Tag[@tag='${GameTag.ZONE}']`)?.get('value') || '-1'),
				zonePosition: parseInt(element.find(`.Tag[@tag='${GameTag.ZONE_POSITION}']`)?.get('value') || '-1'),
				cardType: parseInt(element.find(`.Tag[@tag='${GameTag.CARDTYPE}']`)?.get('value') || '-1'),
				tribe: parseInt(element.find(`.Tag[@tag='${GameTag.CARDRACE}']`)?.get('value') || '-1'),
				atk: parseInt(element.find(`.Tag[@tag='${GameTag.ATK}']`)?.get('value') || '0'),
				health: parseInt(element.find(`.Tag[@tag='${GameTag.HEALTH}']`)?.get('value') || '0'),
			};
		}
		if (structure.entities[element.get('entity')]) {
			if (parseInt(element.get('tag')) === GameTag.CONTROLLER) {
				structure.entities[element.get('entity')].controller = parseInt(element.get('value'));
			}
			if (parseInt(element.get('tag')) === GameTag.ZONE) {
				// console.log('entity', child.get('entity'), structure.entities[child.get('entity')]);
				structure.entities[element.get('entity')].zone = parseInt(element.get('value'));
			}
			if (parseInt(element.get('tag')) === GameTag.ZONE_POSITION) {
				// console.log('entity', child.get('entity'), structure.entities[child.get('entity')]);
				structure.entities[element.get('entity')].zonePosition = parseInt(element.get('value'));
			}
			if (parseInt(element.get('tag')) === GameTag.ATK) {
				// ATK.log('entity', child.get('entity'), structure.entities[child.get('entity')]);
				structure.entities[element.get('entity')].atk = parseInt(element.get('value'));
			}
			if (parseInt(element.get('tag')) === GameTag.HEALTH) {
				// console.log('entity', child.get('entity'), structure.entities[child.get('entity')]);
				structure.entities[element.get('entity')].health = parseInt(element.get('value'));
			}
		}
	};
};

const compositionForTurnPopulate = (structure: ParsingStructure, replay: Replay) => {
	return currentTurn => {
		const playerEntitiesOnBoard = Object.values(structure.entities)
			.map(entity => entity as any)
			.filter(entity => entity.controller === replay.mainPlayerId)
			.filter(entity => entity.zone === Zone.PLAY)
			.filter(entity => entity.cardType === CardType.MINION)
			.map(entity => ({
				cardId: entity.cardId,
				tribe: entity.tribe,
			}));
		structure.boardOverTurn = structure.boardOverTurn.set(currentTurn, playerEntitiesOnBoard);
		// console.log('updated', structure.boardOverTurn.toJS(), playerEntitiesOnBoard);
	};
};

const parseElement = (
	element: Element,
	mainPlayerId: number,
	opponentPlayerEntityId: string,
	parent: Element,
	turnCountWrapper,
	parseFunctions,
	populateFunctions,
) => {
	parseFunctions.forEach(parseFunction => parseFunction(element));
	if (element.tag === 'TagChange') {
		if (
			parseInt(element.get('tag')) === GameTag.NEXT_STEP &&
			parseInt(element.get('value')) === Step.MAIN_START_TRIGGERS
		) {
			// console.log('considering parent', parent.get('entity'), parent);
			if (parent && parent.get('entity') === opponentPlayerEntityId) {
				populateFunctions.forEach(populateFunction => populateFunction(turnCountWrapper.currentTurn));
				turnCountWrapper.currentTurn++;
			}
			// console.log('board for turn', structure.currentTurn, mainPlayerId, '\n', playerEntitiesOnBoard);
		}
		if (
			parseInt(element.get('tag')) === GameTag.PLAYSTATE &&
			[PlayState.WON, PlayState.LOST].indexOf(parseInt(element.get('value'))) !== -1
		) {
			if (element.get('entity') === opponentPlayerEntityId) {
				populateFunctions.forEach(populateFunction => populateFunction(turnCountWrapper.currentTurn));
				turnCountWrapper.currentTurn++;
			}
		}
	}

	const children = element.getchildren();
	if (children && children.length > 0) {
		for (const child of children) {
			parseElement(
				child,
				mainPlayerId,
				opponentPlayerEntityId,
				element,
				turnCountWrapper,
				parseFunctions,
				populateFunctions,
			);
		}
	}
};

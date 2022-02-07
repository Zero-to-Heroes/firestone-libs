import { Map } from 'immutable';
import { Entity } from 'src/public-api';
import { NumericTurnInfo } from '../../model/numeric-turn-info';
import { ValueHeroInfo } from '../../model/value-hero-info';

export interface ParsingStructure {
	currentTurn: number;

	entities: {
		[entityId: string]: {
			entityId: number;
			cardId: string;
			tribe: number;
			controller: number;
			zone: number;
			zonePosition: number;
			cardType: number;
			atk: number;
			health: number;
			premium: number;
			taunt: number;
			windfury: number;
			megaWindfury: number;
			divineShield: number;
			poisonous: number;
			reborn: number;
			tags: Map<string, number>;
		};
	};
	playerHps: {
		[cardId: string]: number;
	};
	leaderboardPositions: {
		[cardId: string]: number;
	};
	mainEnchantEntityIds: string[];
	mainPlayerHeroPowerIds: string[];
	mainPlayerHeroPowersForTurn: number;
	rerollsIds: string[];
	rerollsForTurn: number;
	freezesIds: string[];
	freezesForTurn: number;
	resourcesForTurn: number;
	resourcesUsedForTurn: number;
	minionsSoldIds: string[];
	minionsSoldForTurn: number;
	minionsBoughtIds: string[];
	minionsBoughtForTurn: number;
	damageToEnemyHeroForTurn: ValueHeroInfo;
	wentFirstInBattleThisTurn: boolean;

	boardOverTurn: Map<number, readonly { cardId: string; tribe: number }[]>;
	boardOverTurnDetailed: Map<number, readonly Entity[]>;
	minionsDamageDealt: { [cardId: string]: number };
	minionsDamageReceived: { [cardId: string]: number };
	rerollOverTurn: Map<number, number>;
	freezeOverTurn: Map<number, number>;
	wentFirstInBattleOverTurn: Map<number, boolean>;
	mainPlayerHeroPowerOverTurn: Map<number, number>;
	damageToEnemyHeroOverTurn: Map<number, ValueHeroInfo>;
	coinsWastedOverTurn: Map<number, number>;
	minionsSoldOverTurn: Map<number, number>;
	minionsBoughtOverTurn: Map<number, number>;
	totalStatsOverTurn: Map<number, number>;
	hpOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] };
	leaderboardPositionOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] };
}

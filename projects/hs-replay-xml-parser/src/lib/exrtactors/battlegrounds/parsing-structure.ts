import { Map } from 'immutable';
import { NumericTurnInfo } from '../../model/numeric-turn-info';

export interface ParsingStructure {
	currentTurn: number;

	entities: {
		[entityId: string]: {
			cardId: string;
			tribe: number;
			controller: number;
			zone: number;
			zonePosition: number;
			cardType: number;
			atk: number;
			health: number;
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
	damageToEnemyHeroForTurn: number;
	wentFirstInBattleThisTurn: boolean;

	boardOverTurn: Map<number, readonly { cardId: string; tribe: number }[]>;
	minionsDamageDealt: { [cardId: string]: number };
	minionsDamageReceived: { [cardId: string]: number };
	rerollOverTurn: Map<number, number>;
	freezeOverTurn: Map<number, number>;
	wentFirstInBattleOverTurn: Map<number, boolean>;
	mainPlayerHeroPowerOverTurn: Map<number, number>;
	damageToEnemyHeroOverTurn: Map<number, number>;
	coinsWastedOverTurn: Map<number, number>;
	minionsSoldOverTurn: Map<number, number>;
	minionsBoughtOverTurn: Map<number, number>;
	totalStatsOverTurn: Map<number, number>;
	hpOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] };
	leaderboardPositionOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] };
}

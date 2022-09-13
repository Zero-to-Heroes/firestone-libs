import { AllCardsService, GameTag } from '@firestone-hs/reference-data';
import { BattleResultHistory, BgsBoard, BgsComposition, BgsPlayer, Entity } from '../../model/battlegrounds';
import { BgsFaceOff } from '../../model/bgs-face-off';
import { BgsPostMatchStats } from '../../model/bgs-post-match-stats';
import { Replay } from '../../model/replay';
import { groupByFunction } from '../../utils';
import { buildLuckFactor, parseHsReplayString } from '../../xml-parser';
import { reparseReplay } from './replay-parser';

export const buildPostMatchStats = (
	replayXml: string,
	mainPlayer: BgsPlayer,
	battleResultHistory: readonly BattleResultHistory[],
	faceOffs: readonly BgsFaceOff[], 
	allCards: AllCardsService,
): BgsPostMatchStats => {
	const replay: Replay = parseHsReplayString(replayXml, allCards);
	// console.log('parsed replay', replayXml?.length);
	const player: BgsPlayer = mainPlayer;
	const structure = reparseReplay(replay);
	const compositionsOverTurn: readonly BgsComposition[] = buildCompositionsOverTurn(player?.boardHistory ?? []);
	const postMatchStats: BgsPostMatchStats = {
		tavernTimings: player?.tavernUpgradeHistory ?? [],
		tripleTimings: player?.tripleHistory ?? [], // TODO: add the cards when relevant
		coinsWastedOverTurn: structure.coinsWastedOverTurn,
		rerolls: structure.rerollsOverTurn.map(turnInfo => turnInfo.value).reduce((a, b) => a + b, 0),
		boardHistory: player?.boardHistory ?? structure.boardHistory ?? [],
		rerollsOverTurn: structure.rerollsOverTurn,
		freezesOverTurn: structure.freezesOverTurn,
		mainPlayerHeroPowersOverTurn: structure.mainPlayerHeroPowersOverTurn,
		hpOverTurn: structure.hpOverTurn,
		totalStatsOverTurn: structure.totalStatsOverTurn,
		compositionsOverTurn: compositionsOverTurn,
		minionsBoughtOverTurn: structure.minionsBoughtOverTurn,
		minionsSoldOverTurn: structure.minionsSoldOverTurn,
		totalMinionsDamageDealt: structure.totalMinionsDamageDealt,
		totalMinionsDamageTaken: structure.totalMinionsDamageTaken,
		totalEnemyMinionsKilled: structure.totalEnemyMinionsKilled,
		totalEnemyHeroesKilled: structure.totalEnemyHeroesKilled,
		damageToEnemyHeroOverTurn: structure.damageToEnemyHeroOverTurn,
		wentFirstInBattleOverTurn: structure.wentFirstInBattleOverTurn,
		luckFactor: buildLuckFactor(battleResultHistory),
		battleResultHistory: battleResultHistory,
		faceOffs: faceOffs,
		highestWinStreak: player?.highestWinStreak,
	} as BgsPostMatchStats;
	return postMatchStats;
};

const buildCompositionsOverTurn = (boardHistory: readonly BgsBoard[]): readonly BgsComposition[] => {
	const extractCompositionsForTurn = (board: BgsBoard): readonly BgsComposition[] => {
		const groupedByTribe: { [tribe: string]: readonly Entity[] } = groupByFunction(
			(entity: Entity) =>
				'' +
				GameTag[
					entity.tags.get
						? entity.tags.get(GameTag[GameTag.CARDRACE])
						: entity.tags[GameTag[GameTag.CARDRACE]]
				],
		)(board.board);
		return Object.keys(groupedByTribe).map(tribe => ({
			turn: board.turn,
			tribe: tribe,
			count: groupedByTribe[tribe].length,
		}));
	};
	return boardHistory
		? boardHistory.map(history => extractCompositionsForTurn(history)).reduce((a, b) => a.concat(b), [])
		: [];
};

// Returns -1 if had the worst possible luck, and 1 if had the best possible luck
export const buildWinLuckFactor = (battleResultHistory: readonly BattleResultHistory[]): number => {
	return spreadAroundZero(
		battleResultHistory
			.filter(history => history.simulationResult) // Mostly for dev, shouldn't happen in real life
			.map(history => {
				const victory = history.actualResult === 'won' ? 1 : 0;
				const chance = history.simulationResult.wonPercent / 100;
				return victory - chance;
			})
			.reduce((a, b) => a + b, 0) / battleResultHistory.length,
	);
};
export const buildTieLuckFactor = (battleResultHistory: readonly BattleResultHistory[]): number => {
	return spreadAroundZero(
		battleResultHistory
			.filter(history => history.simulationResult)
			.map(history => {
				const victory = history.actualResult === 'won' || history.actualResult === 'tied' ? 1 : 0;
				const chance = (history.simulationResult.wonPercent + history.simulationResult.tiedPercent) / 100;
				return victory - chance;
			})
			.reduce((a, b) => a + b, 0) / battleResultHistory.length,
	);
};
// Keep the value between -1 and 1 but make it spread more around 0, since the limit cases
// are really rare
const spreadAroundZero = (value: number): number => {
	return Math.sign(value) * Math.pow(Math.abs(value), 0.3);
};

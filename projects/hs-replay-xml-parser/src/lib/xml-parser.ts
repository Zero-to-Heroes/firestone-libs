import { Element } from 'elementtree';
import { allMinionsPlayedExtractor } from './exrtactors/all-minions-played-extractor';
import { buildPostMatchStats, buildWinLuckFactor } from './exrtactors/battlegrounds/battlegrounds-game-extractor';
import { heroPickExtractor } from './exrtactors/battlegrounds/hero-pick-extractor';
import { totalDamageDealtToEnemyHeroExtractor } from './exrtactors/total-damage-dealt-to-enemy-hero-extractor';
import { numberOfTurnsExtractor, totalDurationExtractor } from './exrtactors/total-duration-extractor';
import { killedEnemeyHeroesExtarctor } from './exrtactors/total-enemy-heroes-killed-extractor';
import { totalManaSpentExtractor } from './exrtactors/total-mana-spent-extractor';
import { totalMinionsDeathExtractor } from './exrtactors/total-minions-death-extractor';
import { BattleResultHistory, BgsPlayer } from './model/battlegrounds';
import { BgsFaceOff } from './model/bgs-face-off';
import { BgsPostMatchStats } from './model/bgs-post-match-stats';
import { PlayerOpponentElements } from './model/player-opponent-elements';
import { PlayerOpponentValues } from './model/player-opponent-values';
import { Replay } from './model/replay';
import { buildReplayFromXml } from './replay-parser';

export const parseHsReplayString = (replayString: string): Replay => {
	return buildReplayFromXml(replayString);
};

export const extractTotalManaSpent = (replay: Replay): PlayerOpponentValues => {
	return totalManaSpentExtractor(replay);
};

export const extractTotalDamageDealtToEnemyHero = (replay: Replay): PlayerOpponentValues => {
	return totalDamageDealtToEnemyHeroExtractor(replay);
};

export const extractTotalMinionDeaths = (replay: Replay): PlayerOpponentValues => {
	return totalMinionsDeathExtractor(replay);
};

export const extractTotalDuration = (replay: Replay): number => {
	return totalDurationExtractor(replay);
};

export const extractTotalTurns = (replay: Replay): number => {
	return numberOfTurnsExtractor(replay);
};

export const extractNumberOfKilledEnemyHeroes = (replay: Replay): number => {
	return killedEnemeyHeroesExtarctor(replay);
};

export const extractAllMinionsPlayed = (replay: Replay): PlayerOpponentElements => {
	return allMinionsPlayedExtractor(replay);
};

export const extractBgPlayerPick = (replay: Replay): [readonly Element[], Element] => {
	return heroPickExtractor(replay.replay, replay.mainPlayerId);
};

export const parseBattlegroundsGame = (
	replayXml: string,
	mainPlayer: BgsPlayer,
	battleResultHistory: readonly BattleResultHistory[],
	faceOffs: readonly BgsFaceOff[],
): BgsPostMatchStats => {
	return buildPostMatchStats(replayXml, mainPlayer, battleResultHistory, faceOffs);
};

export const buildLuckFactor = (battleResultHistory: readonly BattleResultHistory[]): number => {
	return buildWinLuckFactor(battleResultHistory);
};

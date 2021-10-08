import { GameType } from '@firestone-hs/reference-data';

export const isMercenaries = (gameMode: number): boolean => {
	return [
		GameType.GT_MERCENARIES_AI_VS_AI,
		GameType.GT_MERCENARIES_FRIENDLY,
		GameType.GT_MERCENARIES_PVE,
		GameType.GT_MERCENARIES_PVP,
		GameType.GT_MERCENARIES_PVE_COOP,
	].includes(gameMode);
};

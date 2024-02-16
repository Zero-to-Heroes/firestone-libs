import { GameAction } from '@firestone-hs/simulate-bgs-battle/dist/simulation/spectator/game-action';
import { GameSample } from '@firestone-hs/simulate-bgs-battle/dist/simulation/spectator/game-sample';

export class ExtendedGameSample implements GameSample {
	readonly actions: readonly GameAction[];
	readonly playerCardId: string;
	readonly playerHeroPowerCardId: string;
	readonly playerHeroPowerUsed: boolean;
	readonly playerRewardCardId: string;
	readonly playerRewardData: number;
	readonly opponentCardId: string;
	readonly opponentHeroPowerCardId: string;
	readonly opponentHeroPowerUsed: boolean;
	readonly opponentRewardCardId: string;
	readonly opponentRewardData: number;

	readonly playerEntityId: number;
	readonly playerHeroPowerEntityId: number;
	readonly playerRewardEntityId: number;
	readonly opponentEntityId: number;
	readonly opponentHeroPowerEntityId: number;
	readonly opponentRewardEntityId: number;
}

import { Injectable } from '@angular/core';
import { CardType, GameTag, GameType, Zone } from '@firestone-hs/reference-data';
import { BoardEntity } from '@firestone-hs/simulate-bgs-battle/dist/board-entity';
import { Damage, GameAction } from '@firestone-hs/simulate-bgs-battle/dist/simulation/spectator/game-action';
import { GameSample } from '@firestone-hs/simulate-bgs-battle/dist/simulation/spectator/game-sample';
import { Map } from 'immutable';
import { Game } from '../../models/game/game';
import { Action, ActionParserConfig, ActionTurn, AttackAction, DamageAction, Entity, MinionDeathAction, PlayerEntity, PowerTargetAction, StartTurnAction, SummonAction, Turn } from '../../models/models';
import { AllCardsService } from '../all-cards.service';
import { NarratorService } from '../gamepipeline/narrator.service';
import { ExtendedGameSample } from './extended-game-sample';

@Injectable({
	providedIn: 'root',
})
export class BattlegroundsSimulationParserService {
	constructor(private allCards: AllCardsService, private narrator: NarratorService) {}

	public async parse(
		bgsSimulation: GameSample,
		config: ActionParserConfig = new ActionParserConfig(),
	): Promise<Game> {
		await this.allCards.initializeCardsDb();
		const bgsSimulationWithIds: ExtendedGameSample = {
			...bgsSimulation,
			playerEntityId: 100000001,
			opponentEntityId: 200000001,
		};

		const playerEntity: PlayerEntity = this.buildPlayerEntity(bgsSimulationWithIds);
		const opponentEntity: PlayerEntity = this.buildOpponentEntity(bgsSimulationWithIds);
		let game: Game = Game.createGame({
			players: [playerEntity, opponentEntity] as readonly PlayerEntity[],
			turns: Map.of(0, this.buildSingleBgsTurn(bgsSimulationWithIds, playerEntity, opponentEntity)),
			gameType: GameType.GT_BATTLEGROUNDS
		} as Game);
		game = this.narrator.populateActionTextForLastTurn(game);
		game = this.narrator.createGameStoryForLastTurn(game);
		// console.log('built game', game, game.turns.toJS());
		return game;
	}

	private buildSingleBgsTurn(
		bgsSimulation: ExtendedGameSample,
		playerEntity: PlayerEntity,
		opponentEntity: PlayerEntity,
	): Turn {
		return ActionTurn.create(({
			turn: 'battle',
			activePlayer: undefined,
			actions: bgsSimulation.actions.map(action => this.buildGameAction(action, playerEntity, opponentEntity)),
		} as any) as ActionTurn);
	}

	private buildGameAction(action: GameAction, playerEntity: PlayerEntity, opponentEntity: PlayerEntity): Action {
		const damages = this.buildDamages(action.type, action.damages, playerEntity, opponentEntity);
		if (action.type === 'start-of-combat') {
			const result = StartTurnAction.create(
				{
					entities: this.buildEntities(action, playerEntity, opponentEntity, damages),
				} as StartTurnAction,
				this.allCards,
			);
			// console.log('built attack action', result, result.entities.toJS());
			return result;
		} else if (action.type === 'player-attack') {
			const result = AttackAction.create(
				{
					entities: this.buildEntities(action, playerEntity, opponentEntity, damages),
					originId: playerEntity.id,
					targetId: opponentEntity.id,
					targets: [[playerEntity.id, opponentEntity.id]] as readonly number[][],
					damages: damages,
				} as AttackAction,
				this.allCards,
			);
			// console.log('built attack action', result, result.entities.toJS());
			return result;
		} else if (action.type === 'opponent-attack') {
			const result = AttackAction.create(
				{
					entities: this.buildEntities(action, playerEntity, opponentEntity, damages),
					originId: opponentEntity.id,
					targetId: playerEntity.id,
					targets: [[opponentEntity.id, playerEntity.id]] as readonly number[][],
					damages: damages
				} as AttackAction,
				this.allCards,
			);
			// console.log('built attack action', result, result.entities.toJS());
			return result;
		} else if (action.type === 'attack') {
			const result = AttackAction.create(
				{
					entities: this.buildEntities(action, playerEntity, opponentEntity, damages),
					originId: action.sourceEntityId,
					targetId: action.targetEntityId,
					targets: [[action.sourceEntityId, action.targetEntityId]] as readonly number[][],
					damages: damages,
				} as AttackAction,
				this.allCards,
			);
			// console.log('built attack action', result, result.entities.toJS());
			return result;
		} else if (action.type === 'damage') {
			return DamageAction.create(
				{
					entities: this.buildEntities(action, playerEntity, opponentEntity, damages),
					damages: damages,
				} as DamageAction,
				this.allCards,
			);
		} else if (action.type === 'power-target') {
			// console.log('parsing powertargetaction', action);
			const targetIds: readonly number[] = action.targetEntityIds ?? [action.targetEntityId];
			return PowerTargetAction.create(
				{
					entities: this.buildEntities(action, playerEntity, opponentEntity, damages),
					originId: action.sourceEntityId,
					targetIds: targetIds,
					targets: targetIds.map(targetId => [action.sourceEntityId, targetId]) as readonly [number, number][],
				} as PowerTargetAction,
				this.allCards,
			);
		} else if (action.type === 'spawn') {
			return SummonAction.create(
				{
					originId: action.sourceEntityId,
					entities: this.buildEntities(action, playerEntity, opponentEntity, null),
					entityIds: action.spawns.map(entity => entity.entityId) as readonly number[],
				} as SummonAction,
				this.allCards,
			);
		} else if (action.type === 'minion-death') {
			return MinionDeathAction.create(
				{
					entities: this.buildEntities(action, playerEntity, opponentEntity, null),
					deadMinions: action.deaths.map(entity => entity.entityId) as readonly number[],
				} as MinionDeathAction,
				this.allCards,
			);
		}
	}

	private buildDamages(actionType: string, damages: Damage[], playerEntity: PlayerEntity, opponentEntity: PlayerEntity): Map<number, number> {
		if (!damages || damages.length === 0) {
			return null;
		}

		if (actionType === 'player-attack') {
			const damage = !!damages?.length ? damages[0].damage ?? 0 ! : 0;
			return Map([[opponentEntity.id, damage]]);
		} else if (actionType === 'opponent-attack') {
			const damage = !!damages?.length ? damages[0].damage ?? 0 ! : 0;
			return Map([[playerEntity.id, damage]]);
		}

		const result: { [damagedEntityId: number]: number } = {};
		for (const damage of damages) {
			result[damage.targetEntityId] = (result[damage.targetEntityId] || 0) + damage.damage;
		}
		const arrayFromWhichToBuildMap: readonly [number, number][] = Object.keys(result).map(damagedEntityId => [
			parseInt(damagedEntityId),
			result[damagedEntityId],
		]);
		// console.log('building damage array', arrayFromWhichToBuildMap, result, damages);
		return Map(arrayFromWhichToBuildMap);
	}

	private buildEntities(
		action: GameAction,
		playerEntity: PlayerEntity,
		opponentEntity: PlayerEntity,
		damages: Map<number, number>,
	): Map<number, Entity> {
		const allSourceEntities = [
			...(action.playerBoard || []),
			...(action.opponentBoard || []),
			// ...(action.spawns || []), // They are already present on the board
			...(action.deaths || []),
		];
		// console.log('parsing action', action.type, allSourceEntities, action);
		const friendlyEntities: readonly Entity[] = allSourceEntities
			.filter(entity => entity.friendly)
			.map((boardEntity, index) =>
				this.buildEntity(
					boardEntity,
					this.findPositionOnBoard(action, boardEntity.entityId) ?? index,
					playerEntity,
					damages,
				),
			);
		const opponentEntities: readonly Entity[] = allSourceEntities
			.filter(entity => !entity.friendly)
			.map((boardEntity, index) =>
				this.buildEntity(
					boardEntity,
					this.findPositionOnBoard(action, boardEntity.entityId) ?? index,
					opponentEntity,
					damages,
				),
			);
			
		// console.log('split entities', friendlyEntities, opponentEntities);
		const allEntities: readonly Entity[] = [
			Object.assign(new PlayerEntity(), playerEntity, { 
				damageForThisAction: damages && damages.get(playerEntity.id) ? damages.get(playerEntity.id) : undefined 
			} as PlayerEntity), 
			Object.assign(new PlayerEntity(), opponentEntity, { 
				damageForThisAction: damages && damages.get(opponentEntity.id) ? damages.get(opponentEntity.id) : undefined 
			} as PlayerEntity), 
			...friendlyEntities, 
			...opponentEntities
		];
		const mapEntries: readonly [number, Entity][] = allEntities.map(entity => [entity.id, entity]);
		// console.log('map entries', mapEntries);
		const result: Map<number, Entity> = Map(mapEntries);
		// console.log('built entities', result.get(1), result);
		return result;
	}

	private findPositionOnBoard(action: GameAction, entityId: number): number {
		if (!action.deaths) {
			return undefined;
		}

		for (let i = 0; i < action.deaths.length; i++) {
			if (action.deaths[i].entityId === entityId) {
				return action.deadMinionsPositionsOnBoard[i];
			}
		}
		return undefined;
	}

	private buildEntity(
		boardEntity: BoardEntity,
		boardPosition: number,
		playerEntity: PlayerEntity,
		damages: Map<number, number>,
	): Entity {
		const tags: Map<string, number> = Map({
			[GameTag[GameTag.CONTROLLER]]: playerEntity.playerId,
			[GameTag[GameTag.CARDTYPE]]: CardType.MINION,
			[GameTag[GameTag.ZONE]]: Zone.PLAY,
			[GameTag[GameTag.ZONE_POSITION]]: boardPosition,
			[GameTag[GameTag.ATK]]: boardEntity.attack,
			[GameTag[GameTag.HEALTH]]: boardEntity.maxHealth ?? boardEntity.health,
			[GameTag[GameTag.DAMAGE]]:( boardEntity.maxHealth ?? boardEntity.health) - boardEntity.health,
			[GameTag[GameTag.TAUNT]]: boardEntity.taunt ? 1 : 0,
			[GameTag[GameTag.POISONOUS]]: boardEntity.poisonous ? 1 : 0,
			[GameTag[GameTag.DIVINE_SHIELD]]: boardEntity.divineShield ? 1 : 0,
			[GameTag[GameTag.REBORN]]: boardEntity.reborn ? 1 : 0,
			[GameTag[GameTag.WINDFURY]]: boardEntity.windfury || boardEntity.megaWindfury ? 1 : 0,
			[GameTag[GameTag.PREMIUM]]: this.allCards.getCard(boardEntity.cardId).battlegroundsNormalDbfId ? 1 : 0,
		});
		return Entity.create({
			id: boardEntity.entityId,
			cardID: boardEntity.cardId,
			tags: tags,
			damageForThisAction:
				damages && damages.get(boardEntity.entityId) ? damages.get(boardEntity.entityId) : undefined,
		} as Entity);
	}

	private buildPlayerEntity(bgsSimulation: ExtendedGameSample): PlayerEntity {
		return this.buildGenericPlayerEntity(
			'Player',
			bgsSimulation.playerEntityId - 1,
			bgsSimulation.playerEntityId,
			bgsSimulation.playerCardId,
		);
	}

	private buildOpponentEntity(bgsSimulation: ExtendedGameSample): PlayerEntity {
		return this.buildGenericPlayerEntity(
			'Opponent',
			bgsSimulation.opponentEntityId - 1,
			bgsSimulation.opponentEntityId,
			bgsSimulation.opponentCardId,
		);
	}

	private buildGenericPlayerEntity(
		name: string,
		playerId: number,
		playerEntityId: number,
		playerCardId: string,
	): PlayerEntity {
		const tags: Map<string, number> = Map({
			[GameTag[GameTag.PLAYER_ID]]: playerId,
			[GameTag[GameTag.CARDTYPE]]: CardType.PLAYER,
			// Cheating here: using the same entity for player and hero
			[GameTag[GameTag.HERO_ENTITY]]: playerEntityId,
			[GameTag[GameTag.ZONE]]: Zone.PLAY,
		});
		return PlayerEntity.create({
			id: playerEntityId,
			playerId: playerId,
			cardID: playerCardId,
			name: name,
			tags: tags,
		} as PlayerEntity);
	}
}

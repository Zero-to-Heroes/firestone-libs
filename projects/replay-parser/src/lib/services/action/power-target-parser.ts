import { BlockType, CardType, GameTag, MetaTags } from '@firestone-hs/reference-data';
import { Map } from 'immutable';
import isEqual from 'lodash-es/isEqual';
import uniq from 'lodash-es/uniq';
import { NGXLogger } from 'ngx-logger';
import { Action } from '../../models/action/action';
import { AttachingEnchantmentAction } from '../../models/action/attaching-enchantment-action';
import { CardTargetAction } from '../../models/action/card-target-action';
import { PowerTargetAction } from '../../models/action/power-target-action';
import { Entity } from '../../models/game/entity';
import { ActionHistoryItem } from '../../models/history/action-history-item';
import { HistoryItem } from '../../models/history/history-item';
import { MetadataHistoryItem } from '../../models/history/metadata-history-item';
import { CardPlayedFromHandAction, SummonAction } from '../../models/models';
import { Info } from '../../models/parser/info';
import { MetaData } from '../../models/parser/metadata';
import { AllCardsService } from '../all-cards.service';
import { ActionHelper } from './action-helper';
import { Parser } from './parser';

export class PowerTargetParser implements Parser {
	constructor(private allCards: AllCardsService, private logger: NGXLogger) {}

	public applies(item: HistoryItem): boolean {
		if (!(item instanceof MetadataHistoryItem)) {
			return false;
		}
		const meta = item.meta;
		if (!meta.info && !meta.meta) {
			return false;
		}
		if (meta.meta !== MetaTags[MetaTags.TARGET]) {
			return false;
		}
		return true;
	}

	debug = false;

	public parse(
		item: MetadataHistoryItem,
		currentTurn: number,
		entitiesBeforeAction: Map<number, Entity>,
		history: readonly HistoryItem[],
	): Action[] {
		const meta = item.meta;
		const parentAction = history
			.filter(historyItem => historyItem.index === item.meta.parentIndex)
			.filter(historyItem => historyItem instanceof ActionHistoryItem)
			.map(historyItem => historyItem as ActionHistoryItem)[0];
		if (
			parseInt(parentAction.node.attributes.type) !== BlockType.POWER &&
			parseInt(parentAction.node.attributes.type) !== BlockType.TRIGGER
		) {
			return;
		}
		if (parseInt(parentAction.node.attributes.entity) === 51) {
			this.debug = true;
		}
		// TODO: hard-code Malchezaar?
		if (meta.info) {
			return meta.info
				.map(info => this.buildPowerActions(entitiesBeforeAction, parentAction, meta, info))
				.reduce((a, b) => a.concat(b), []);
		}
	}

	private buildPowerActions(
		entities: Map<number, Entity>,
		item: ActionHistoryItem,
		meta: MetaData,
		info: Info,
	): PowerTargetAction[] {
		const entityId = parseInt(item.node.attributes.entity);
		if (this.debug) {
			console.warn(
				'building power target action action for defile 51',
				entityId,
				info.entity,
				entities.get(entityId),
				entities.get(entityId) && entities.get(entityId).tags.toJS(),
			);
		}
		// Prevent a spell from targeting itself
		if (
			entityId === info.entity &&
			entities.get(entityId) &&
			entities.get(entityId).getTag(GameTag.CARDTYPE) === CardType.SPELL
		) {
			return [];
		}
		let target = info.entity;
		if (!target && parseInt(item.node.attributes.target)) {
			target = parseInt(item.node.attributes.target);
		}
		if (!target) {
			return [];
		}
		return [
			PowerTargetAction.create(
				{
					timestamp: item.timestamp,
					index: meta.index,
					originId: entityId,
					targetIds: [target],
				},
				this.allCards,
			),
		];
	}

	public reduce(actions: readonly Action[]): readonly Action[] {
		return ActionHelper.combineActions<Action>(
			actions,
			(previous, current) => this.shouldMergeActions(previous, current),
			(previous, current) => this.mergeActions(previous, current),
		);
	}

	private shouldMergeActions(previousAction: Action, currentAction: Action): boolean {
		if (!(currentAction instanceof PowerTargetAction)) {
			return false;
		}
		if (previousAction instanceof PowerTargetAction) {
			return previousAction.originId === currentAction.originId;
		}
		// Spells that target would trigger twice otherwise
		if (previousAction instanceof CardTargetAction) {
			return previousAction.originId === currentAction.originId;
		}
		if (previousAction instanceof AttachingEnchantmentAction) {
			if (
				previousAction.originId === currentAction.originId &&
				isEqual(previousAction.targetIds, currentAction.targetIds)
			) {
				return true;
			}
		}
		if (previousAction instanceof CardPlayedFromHandAction) {
			return previousAction.entityId === currentAction.originId;
		}
		if (previousAction instanceof SummonAction) {
			return previousAction.originId === currentAction.originId;
		}
		return false;
	}

	private mergeActions(previousAction: Action, currentAction: Action): Action {
		if (!(currentAction instanceof PowerTargetAction)) {
			this.logger.warn('incorrect currentAction as current action for power-target-parser', currentAction);
			return;
		}
		if (previousAction instanceof PowerTargetAction || previousAction instanceof CardTargetAction) {
			return ActionHelper.mergeIntoFirstAction(previousAction, currentAction, {
				entities: currentAction.entities,
				originId: currentAction.originId,
				targetIds: uniq([
					...uniq(previousAction.targetIds || []),
					...uniq(currentAction.targetIds || []),
				]) as readonly number[],
			} as PowerTargetAction);
		} else if (previousAction instanceof AttachingEnchantmentAction) {
			return previousAction;
		} else if (previousAction instanceof SummonAction) {
			return previousAction;
		} else if (previousAction instanceof CardPlayedFromHandAction) {
			console.warn('merging power target with played from hand', previousAction, currentAction);
			return ActionHelper.mergeIntoFirstAction(previousAction, currentAction, {
				entities: currentAction.entities,
				originId: previousAction.entityId,
				targetIds: uniq([
					...uniq(previousAction.targetIds || []),
					...uniq(currentAction.targetIds || []),
				]) as readonly number[],
			} as CardPlayedFromHandAction);
		}
	}
}

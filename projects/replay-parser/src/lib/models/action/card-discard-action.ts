import { Map } from 'immutable';
import uniq from 'lodash-es/uniq';
import { ActionHelper } from '../../services/action/action-helper';
import { AllCardsService } from '../../services/all-cards.service';
import { Entity } from '../game/entity';
import { Action } from './action';

export class CardDiscardAction extends Action {
	readonly data: readonly number[];
	readonly controller: number;

	constructor(private allCards: AllCardsService) {
		super();
	}

	public static create(newAction, allCards: AllCardsService): CardDiscardAction {
		return Object.assign(new CardDiscardAction(allCards), newAction);
	}

	public update(entities: Map<number, Entity>): CardDiscardAction {
		return Object.assign(this.getInstance(), this, { entities });
	}

	public enrichWithText(): CardDiscardAction {
		const playerEntity = this.data.map(entityId => ActionHelper.getOwner(this.entities, entityId));
		if (!playerEntity || playerEntity.length === 0) {
			console.warn('[discard-action] could not find player owner', this.data);
			return this;
		}
		const ownerNames: string[] = uniq(
			this.data
				.map(entityId => ActionHelper.getOwner(this.entities, entityId))
				.map(entity => {
					if (!entity) {
						console.warn(
							'[discard-action] no player entity',
							entity,
							this.data,
							this.entities.get(this.data[0]).tags.toJS(),
						);
						return '';
					}
					return entity.name;
				}),
		);
		if (ownerNames.length !== 1) {
			throw new Error('[discard-action] Invalid grouping of cards ' + ownerNames + ', ' + this.data);
		}
		const ownerName = ownerNames[0];
		const discardedCards = this.data
			.map(entityId => ActionHelper.getCardId(this.entities, entityId))
			.map(cardId => this.allCards.getCard(cardId));
		let discardInfo = '';
		if (discardedCards.some(card => !card || !card.name)) {
			discardInfo = `${discardedCards.length} cards`;
		} else {
			discardInfo = discardedCards.map(card => card.name).join(', ');
		}

		const textRaw = `\t${ownerName} discards ` + discardInfo;
		return Object.assign(this.getInstance(), this, { textRaw });
	}

	protected getInstance(): Action {
		return new CardDiscardAction(this.allCards);
	}
}

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CardClass, GameTag } from '@firestone-hs/reference-data';
import { AllCardsService, Entity } from '@firestone-hs/replay-parser';

@Component({
	selector: 'secret',
	styleUrls: ['./secret.component.scss'],
	template: `
		<div class="secret" cardTooltip [tooltipEntity]="_entity" [attr.data-entity-id]="entityId">
			<img class="secret-image" src="{{ image }}" />
			<img class="question-mark" src="{{ markImage }}" />
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretComponent {
	_entity: Entity;
	entityId: number;
	image: string;
	markImage = 'https://static.zerotoheroes.com/hearthstone/asset/coliseum/images/secrets/secret_question_mark.png';

	constructor(private cards: AllCardsService) {}

	@Input('entity') set entity(value: Entity) {
		// console.log('[secret] setting new entity', value, value.tags.toJS());
		this._entity = value;
		this.image = undefined;
		if (value) {
			this.entityId = value.id;
			const playerClass: number = value.getTag(GameTag.CLASS);
			if (playerClass) {
				this.image = this.buildImage(playerClass);
			} else if (value.cardID) {
				const card = this.cards.getCard(value.cardID);
				this.image = this.buildImageFromDb(card.cardClass);
			} else {
				console.error('[secret] Could not assign player class', value, value.tags.toJS());
			}
		}
	}

	private buildImage(playerClass: number): string {
		switch (playerClass) {
			case CardClass.HUNTER:
				return this.getImage('secret_hunter');
			case CardClass.MAGE:
				return this.getImage('secret_mage');
			case CardClass.PALADIN:
				return this.getImage('secret_paladin');
			case CardClass.ROGUE:
				return this.getImage('secret_rogue');
			default:
				console.error('[secret] invalid class requested', playerClass);
				return '';
		}
	}

	private buildImageFromDb(playerClass: string): string {
		switch (playerClass) {
			case 'HUNTER':
				return this.getImage('secret_hunter');
			case 'MAGE':
				return this.getImage('secret_mage');
			case 'PALADIN':
				return this.getImage('secret_paladin');
			case 'ROGUE':
				return this.getImage('secret_rogue');
			default:
				console.error('[secret] invalid class requested', playerClass);
				return '';
		}
	}

	private getImage(image: string) {
		return `https://static.zerotoheroes.com/hearthstone/asset/coliseum/images/secrets/${image}.png`;
	}
}

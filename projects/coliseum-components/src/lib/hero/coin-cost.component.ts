import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, Input, ViewRef } from '@angular/core';
import { AllCardsService } from '@firestone-hs/replay-parser';

@Component({
	selector: 'coin-cost',
	styleUrls: ['../global/text.scss', './coin-cost.component.scss', '../card/card-cost-colors.scss'],
	template: `
		<div class="coin-cost {{ costClass }}">
			<img src="https://static.zerotoheroes.com/hearthstone/asset/coliseum/images/battlegrounds/coin_mana.png" />
			<div class="cost">{{ _cost }}</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinCostComponent implements AfterViewInit {
	_cost: number;
	costClass: string;

	private _cardId: string;

	constructor(
		private cards: AllCardsService,
		private elRef: ElementRef,
		
		private cdr: ChangeDetectorRef,
	) {}

	@Input('cardId') set cardId(cardId: string) {
		this._cardId = cardId;
		this.updateCost();
	}

	@Input('cost') set cost(cost: number) {
		this._cost = cost;
		this.updateCost();
	}

	@HostListener('window:resize', ['$event'])
	onResize(event) {
		this.resizeText();
	}

	ngAfterViewInit() {
		setTimeout(() => this.resizeText());
	}

	private updateCost() {
		if (!this._cardId) {
			return;
		}
		this.costClass = undefined;
		const originalCard = this.cards.getCard(this._cardId);
		const originalCost: number = originalCard.cost;

		if (this._cost == null) {
			this._cost = originalCost;
		}

		if (this._cost < originalCost) {
			this.costClass = 'lower-cost';
		} else if (this._cost > originalCost) {
			this.costClass = 'higher-cost';
		}
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	private resizeText() {
		const el = this.elRef.nativeElement.querySelector('.coin-cost');
		if (!el) {
			setTimeout(() => this.resizeText());
			return;
		}
		const fontSize = 0.6 * el.getBoundingClientRect().width;
		const textEl = this.elRef.nativeElement.querySelector('.cost');
		textEl.style.fontSize = fontSize + 'px';
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}
}

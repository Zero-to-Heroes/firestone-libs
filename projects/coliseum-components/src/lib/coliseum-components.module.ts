import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReplayParserModule } from '@firestone-hs/replay-parser';
import { BoardCardFrameComponent } from './board/board-card-frame.component';
import { BoardCardStatsComponent } from './board/board-card-stats.component';
import { BoardComponent } from './board/board.component';
import { CardOnBoardOverlaysComponent } from './board/card-on-board-overlays.component';
import { CardOnBoardComponent } from './board/card-on-board.component';
import { PowerIndicatorComponent } from './board/power-indicator.component';
import { SleepingComponent } from './board/sleeping.component';
import { CardArtComponent } from './card/card-art.component';
import { CardCostComponent } from './card/card-cost.component';
import { CardEnchantmentComponent } from './card/card-enchantment.component';
import { CardEnchantmentsComponent } from './card/card-enchantments.component';
import { CardFrameComponent } from './card/card-frame.component';
import { CardNameComponent } from './card/card-name.component';
import { CardRaceComponent } from './card/card-race.component';
import { CardRarityComponent } from './card/card-rarity.component';
import { CardStatsComponent } from './card/card-stats.component';
import { CardTextComponent } from './card/card-text.component';
import { CardComponent } from './card/card.component';
import { DamageComponent } from './card/damage.component';
import { OverlayBurnedComponent } from './card/overlay-burned.component';
import { OverlayCrossedComponent } from './card/overlay-crossed.component';
import { OverlayTickedComponent } from './card/overlay-ticked.component';
import { TavernLevelIconComponent } from './card/tavern-level-icon.component';
import { CardElementResizeDirective } from './directives/card-element-resize.directive';
import { CardResizeDirective } from './directives/card-resize.directive';
import { CardTooltipDirective } from './directives/card-tooltip.directive';
import { TransitionGroupItemDirective } from './directives/transition-group-item.directive';
import { TransitionGroupComponent } from './global/transition-group.component';
import { CoinCostComponent } from './hero/coin-cost.component';
import { HeroArtComponent } from './hero/hero-art.component';
import { HeroCardComponent } from './hero/hero-card.component';
import { HeroFrameComponent } from './hero/hero-frame.component';
import { HeroOverlaysComponent } from './hero/hero-overlays.component';
import { HeroPowerArtComponent } from './hero/hero-power-art.component';
import { HeroPowerCostComponent } from './hero/hero-power-cost.component';
import { HeroPowerFrameComponent } from './hero/hero-power-frame.component';
import { HeroPowerComponent } from './hero/hero-power.component';
import { HeroStatsComponent } from './hero/hero-stats.component';
import { HeroComponent } from './hero/hero.component';
import { QuestComponent } from './hero/quest.component';
import { SecretComponent } from './hero/secret.component';
import { SecretsComponent } from './hero/secrets.component';
import { TavernButtonComponent } from './hero/tavern-button.component';
import { WeaponArtComponent } from './hero/weapon-art.component';
import { WeaponFrameComponent } from './hero/weapon-frame.component';
import { WeaponStatsComponent } from './hero/weapon-stats.component';
import { WeaponComponent } from './hero/weapon.component';

@NgModule({
	imports: [BrowserModule, FormsModule, BrowserAnimationsModule, ReplayParserModule.forRoot()],
	declarations: [
		BoardComponent,
		BoardCardFrameComponent,
		BoardCardStatsComponent,
		CardOnBoardOverlaysComponent,
		CardOnBoardComponent,
		PowerIndicatorComponent,
		SleepingComponent,

		CardArtComponent,
		CardCostComponent,
		CardEnchantmentComponent,
		CardEnchantmentsComponent,
		CardFrameComponent,
		CardNameComponent,
		CardRaceComponent,
		CardRarityComponent,
		CardStatsComponent,
		CardTextComponent,
		CardComponent,
		DamageComponent,
		OverlayBurnedComponent,
		OverlayCrossedComponent,
		OverlayTickedComponent,
		TavernLevelIconComponent,

		CoinCostComponent,
		HeroArtComponent,
		HeroCardComponent,
		HeroFrameComponent,
		HeroOverlaysComponent,
		HeroPowerArtComponent,
		HeroPowerCostComponent,
		HeroPowerFrameComponent,
		HeroPowerComponent,
		HeroStatsComponent,
		HeroComponent,
		QuestComponent,
		SecretComponent,
		SecretsComponent,
		TavernButtonComponent,
		WeaponArtComponent,
		WeaponFrameComponent,
		WeaponStatsComponent,
		WeaponComponent,

		CardElementResizeDirective,
		CardResizeDirective,
		CardTooltipDirective,
		TransitionGroupItemDirective,
		TransitionGroupComponent,
	],
	exports: [
		BoardComponent,
		BoardCardFrameComponent,
		BoardCardStatsComponent,
		CardOnBoardOverlaysComponent,
		CardOnBoardComponent,
		PowerIndicatorComponent,
		SleepingComponent,

		CardArtComponent,
		CardCostComponent,
		CardEnchantmentComponent,
		CardEnchantmentsComponent,
		CardFrameComponent,
		CardNameComponent,
		CardRaceComponent,
		CardRarityComponent,
		CardStatsComponent,
		CardTextComponent,
		CardComponent,
		DamageComponent,
		OverlayBurnedComponent,
		OverlayCrossedComponent,
		OverlayTickedComponent,
		TavernLevelIconComponent,

		CoinCostComponent,
		HeroArtComponent,
		HeroCardComponent,
		HeroFrameComponent,
		HeroOverlaysComponent,
		HeroPowerArtComponent,
		HeroPowerCostComponent,
		HeroPowerFrameComponent,
		HeroPowerComponent,
		HeroStatsComponent,
		HeroComponent,
		QuestComponent,
		SecretComponent,
		SecretsComponent,
		TavernButtonComponent,
		WeaponArtComponent,
		WeaponFrameComponent,
		WeaponStatsComponent,
		WeaponComponent,

		CardElementResizeDirective,
		CardResizeDirective,
		CardTooltipDirective,
		TransitionGroupItemDirective,
		TransitionGroupComponent,
	],
})
export class ColiseumComponentsModule {}

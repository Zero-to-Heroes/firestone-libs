import { ModuleWithProviders } from '@angular/core';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

@NgModule({
	declarations: [],
	imports: [BrowserModule],
	exports: [],
})
export class ReplayParserModule {
	static forRoot(): ModuleWithProviders<ReplayParserModule> {
		return {
			ngModule: ReplayParserModule,
			providers: [],
		};
	}
}

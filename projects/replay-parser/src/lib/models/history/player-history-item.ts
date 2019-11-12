import { EntityDefinition } from '../parser/entity-definition';
import { HistoryItem } from './history-item';

export class PlayerHistoryItem extends HistoryItem {
	readonly entityDefintion: EntityDefinition;
	readonly accountHi: string;
	readonly accountLo: string;

	constructor(
		entityDefintion: EntityDefinition,
		accountHi: string,
		accountLo: string,
		timestamp: number,
		index: number,
	) {
		super(timestamp, index);
		this.entityDefintion = entityDefintion;
		this.accountHi = accountHi;
		this.accountLo = accountLo;
	}
}

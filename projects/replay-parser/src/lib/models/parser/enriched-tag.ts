import { SaxesTagPlain } from 'saxes';
import { EntityDefinition } from './entity-definition';
import { EntityTag } from './entity-tag';
import { MetaData } from './metadata';
import { Option } from './option';

export interface EnrichedTag extends SaxesTagPlain {
	index?: number;
	showEntities?: readonly EntityDefinition[];
	fullEntities?: readonly EntityDefinition[];
	// hideEntities?: readonly number[];
	tags?: readonly EntityTag[];
	options?: readonly Option[];
	meta?: readonly MetaData[];
	parentIndex?: number;
}

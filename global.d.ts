import type {NaiveBase93} from '@blake.regalia/belt';

declare module '*?base93' {
	const sb93_export: NaiveBase93;
	export default sb93_export;
}

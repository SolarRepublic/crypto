import {base93_to_bytes, bytes_to_text} from '@blake.regalia/belt';

import {gunzip_bytes} from './compression';
import SB93_GZIP_WORDLIST from '../resource/bip-0039-english.txt';

let a_wordlist!: string[];

export const bip39_wordlist_english = async(): Promise<string[]> => a_wordlist ??= bytes_to_text(
	await gunzip_bytes(base93_to_bytes(SB93_GZIP_WORDLIST))).split('\n');

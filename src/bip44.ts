import type {DestroyableBytes} from './bip39';
import type {RuntimeKeyHandle} from './runtime-key';

import {__UNDEFINED} from '@blake.regalia/belt';

import {bip32_from_master, bip32_derive_from_path, bip32_export} from './bip32';
import {bip39_mnemonic_to_seed, bip39_passphrase_parse} from './bip39';
import {runtime_key_access} from './runtime-key';

export type Bip44Path = `m/44'/${bigint}'/${bigint}'/${bigint}/${bigint}`;

/**
 * Converts a mnemonic seed phrase and BIP-44 path into a private key
 * @param s_mnemonic - the mnemonic seed phrase as a string
 * @param s_bip44_path - the BIP-44 path to the account
 * @returns the private key as a RuntimeKeyHandle
 */
export const bip44_mnemonic_to_private_key = async(
	s_mnemonic: string,
	s_bip44_path: Bip44Path,
	s_passphrase?: string
): Promise<RuntimeKeyHandle> => {
	// parse mnemonic
	const atu8_mnemonic = bip39_passphrase_parse(s_mnemonic);

	// convert to seed
	const k_seed = await bip39_mnemonic_to_seed(atu8_mnemonic as DestroyableBytes, s_passphrase? bip39_passphrase_parse(s_passphrase): __UNDEFINED);

	// create BIP-32 master seed
	const k_bip32_root = await runtime_key_access(k_seed, atu8_master => bip32_from_master(atu8_master));

	// derive account key
	const k_bip32_account = await bip32_derive_from_path(k_bip32_root, s_bip44_path);

	// export account private key
	return bip32_export(k_bip32_account);
};

import {hasher_loader} from './_hash';

export const [keccak256_wasm_load, keccak256_wasm] = hasher_loader('sha3', 32, {}, 'keccak256', 0x01);

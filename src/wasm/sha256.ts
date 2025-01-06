import {hasher_loader} from './_hash';

export const [sha256_sync_wasm_load, sha256_sync_wasm] = hasher_loader('sha256', 32);

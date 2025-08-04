/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {secp256k1_es_ecdh, secp256k1_es_gen_sk, secp256k1_es_sign, secp256k1_es_sk_to_pk, secp256k1_es_tweak_sk_add, secp256k1_es_tweak_sk_mul, secp256k1_es_valid_sk, secp256k1_es_verify} from './es/secp256k1';
import {secp256k1_wasm} from './wasm/secp256k1';

export const secp256k1_gen_sk = () => (secp256k1_wasm()?.gen_sk ?? secp256k1_es_gen_sk)();

export const secp256k1_sk_to_pk = (atu8_sk: Uint8Array) => (secp256k1_wasm()?.sk_to_pk ?? secp256k1_es_sk_to_pk)(atu8_sk);

export const secp256k1_valid_sk = (atu8_sk: Uint8Array) => (secp256k1_wasm()?.valid_sk ?? secp256k1_es_valid_sk)(atu8_sk);

export const secp256k1_sign = (atu8_sk: Uint8Array, atu8_hash: Uint8Array, atu8_ent: Uint8Array<ArrayBuffer>) => (secp256k1_wasm()?.sign ?? secp256k1_es_sign)(atu8_sk, atu8_hash, atu8_ent);

export const secp256k1_verify = (atu8_signature: Uint8Array, atu8_hash: Uint8Array, atu8_pk33: Uint8Array) => (secp256k1_wasm()?.verify ?? secp256k1_es_verify)(atu8_signature, atu8_hash, atu8_pk33);

export const secp256k1_ecdh = (atu8_sk: Uint8Array, atu8_pk33_other: Uint8Array) => (secp256k1_wasm()?.ecdh ?? secp256k1_es_ecdh)(atu8_sk, atu8_pk33_other);

export const secp256k1_tweak_sk_add = (atu8_sk: Uint8Array, atu8_tweak: Uint8Array) => (secp256k1_wasm()?.tweak_sk_add ?? secp256k1_es_tweak_sk_add)(atu8_sk, atu8_tweak);

export const secp256k1_tweak_sk_mul = (atu8_sk: Uint8Array, atu8_tweak: Uint8Array) => (secp256k1_wasm()?.tweak_sk_mul ?? secp256k1_es_tweak_sk_mul)(atu8_sk, atu8_tweak);

// export const secp256k1_tweak_pk_add = (atu8_pk: Uint8Array, atu8_tweak: Uint8Array) => (secp256k1_wasm()?.tweak_pk_add ?? secp256k1_es_tweak_pk_add)(atu8_pk, atu8_tweak);

// export const secp256k1_tweak_pk_mul = (atu8_pk: Uint8Array, atu8_tweak: Uint8Array) => (secp256k1_wasm()?.tweak_pk_mul ?? secp256k1_es_tweak_pk_mul)(atu8_pk, atu8_tweak);

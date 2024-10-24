import {bytes} from '@blake.regalia/belt';

export const HM_PRIVATES = new WeakMap<any, any>() as WeakMap<any, any> & {
	get<w_return>(w_key: any): w_return;
};

export const random_bytes = (nb_size: number): Uint8Array => crypto.getRandomValues(bytes(nb_size));

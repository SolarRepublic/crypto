import {bytes} from '@blake.regalia/belt';

export const random_bytes = (nb_size: number): Uint8Array => crypto.getRandomValues(bytes(nb_size));

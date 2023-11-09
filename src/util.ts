import {buffer} from '@blake.regalia/belt';

export const random_bytes = (nb_size: number): Uint8Array => crypto.getRandomValues(buffer(nb_size));

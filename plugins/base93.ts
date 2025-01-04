import type {Plugin} from 'rollup';

import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';

import {try_sync, bytes_to_base93} from '@blake.regalia/belt';

const SI_B93_EXPORT = '\0base93-export?';
const SI_B93_IMPORT = '\0base93-import?';
const SI_GZ_B93_IMPORT = '\0base93-import?';
const SI_B93_SPECIFIER_SUFFIX = '?base93';
const SI_GZ_B93_SPECIFIER_SUFFIX = '?gz.base93';

export function base93Encoder(): Plugin {
	return {
		name: 'base93-encoder',

		resolveId(si_specifier) {
			// importer is attempting to statically import an nfp module
			if(si_specifier.endsWith(SI_B93_SPECIFIER_SUFFIX)) {
				// mark the specifier as a module to import
				return {
					id: SI_B93_IMPORT+si_specifier.slice(0, -SI_B93_SPECIFIER_SUFFIX.length),
					moduleSideEffects: true,
				};
			}
			// importer is attempting to statically import an nfp module
			else if(si_specifier.endsWith(SI_GZ_B93_SPECIFIER_SUFFIX)) {
				// mark the specifier as a module to import
				return {
					id: SI_GZ_B93_IMPORT+si_specifier.slice(0, -SI_GZ_B93_SPECIFIER_SUFFIX.length),
					moduleSideEffects: true,
				};
			}
		},

		async load(si_module) {
			// console.log(si_asset);

			// statically importing an nfp module
			if(si_module.startsWith(SI_B93_IMPORT)) {
				const sr_import = si_module.slice(SI_B93_IMPORT.length);

				const p_import = await this.resolve(sr_import);

				console.log(`📦 Loading ${sr_import} // ${p_import}`);
				const [atu8_asset] = try_sync(() => readFileSync(sr_import));
				if(!atu8_asset) {
					console.error(`❌ Nothing at ${sr_import}`);
				}

				return `export default "foo";`;
			}
			// statically importing an nfp module
			else if(si_module.startsWith(SI_GZ_B93_IMPORT)) {
				const p_asset = si_module.slice(SI_GZ_B93_IMPORT.length);
				console.log(`📦 Loading ${p_asset} // ${this.resolve(p_asset)}`);
				const [atu8_asset] = try_sync(() => readFileSync(p_asset));
				if(!atu8_asset) {
					console.error(`❌ Nothing at ${p_asset}`);
				}

				const atu8_gzipped = gzipSync(atu8_asset!, {
					level: 9,
				});

				return `export default "${bytes_to_base93(atu8_gzipped)}";`;
			}
		},
	};
}


// import type {NfpModuleConfig, Plugin} from '../_types';

// import type {Dict} from '@blake.regalia/belt';
// import type {
// 	BaseNode,
// 	CallExpression,
// 	Node,
// 	Identifier,
// 	AssignmentProperty,
// } from 'estree';

// import type {AcornNode, PluginContext} from 'rollup';

// import fs from 'node:fs/promises';
// import path from 'node:path';

// import {sha256, text_to_buffer, buffer_to_base93, ode, odv, buffer_to_hex, oderom, fodemtv, fold, ofe} from '@blake.regalia/belt';

// import {attachScopes, createFilter, makeLegalIdentifier} from '@rollup/pluginutils';
// import * as astring from 'astring';
// import {walk} from 'estree-walker';
// import MagicString from 'magic-string';

// import {SI_DESTRUCTURE_CALL, checkNodeForDynamicImport} from './dynamic-imports.js';

// const S_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';


// const identifier_for_module = (si_file: string) => makeLegalIdentifier(SI_GLOBAL_RUNTIME_PREFIX+path.parse(si_file).name);

// export interface NfpModulesJson {
// 	schema: string;
// 	comment?: string;
// 	modules: Record<string, {
// 		version: `${bigint}.${bigint}`;
// 		hash: string;
// 		exports: {
// 			[si_other: string]: Dict<ExportEntry>;
// 			'.': Dict<ExportEntry>;
// 		};
// 		dependencies: Dependencies;
// 	}>;
// }

// export interface NfpxWindowConfig extends NfpModuleConfig {
// 	importsOnly?: boolean;
// }


// // loads nfp module json
// export async function loadNfpModulesJson({
// 	error: f_error,
// }: {
// 	error: PluginContext['error'] | ((s_msg: string, y_node?: Node) => never);
// }): Promise<NfpModulesJson> {
// 	// read .nfp-modules.json
// 	let sx_json = '';
// 	try {
// 		sx_json = await fs.readFile(SR_NFP_MODULES_JSON, 'utf-8');
// 	}
// 	catch(e_access) {
// 		if('ENOENT' !== (e_access as {code: string}).code) {
// 			return f_error(`Failed to read ${SR_NFP_MODULES_JSON}`);
// 		}
// 	}

// 	// prep structure
// 	let g_json: NfpModulesJson = {
// 		schema: '1',
// 		comment: 'Do not edit or delete this generated file! It should also be committed to version control.',
// 		modules: {},
// 	};

// 	// parse file contents
// 	if(sx_json.trim()) {
// 		try {
// 			g_json = JSON.parse(sx_json) as unknown as NfpModulesJson;

// 			if(!g_json.modules) {
// 				throw new Error('Missing modules key');
// 			}
// 		}
// 		catch(e_parse) {
// 			return f_error(`Corrupt ${SR_NFP_MODULES_JSON} file: ${(e_parse as Error).stack!}`);
// 		}
// 	}

// 	// update fields
// 	return g_json;

// 	// g_nfp_module = g_nfp_modules_json.modules[si_export];
// }

// export function nfpxWindow() {
// 	const si_export = gc_nfpm.id;
// 	if(!si_export) {
// 		throw new Error(`Must supply an 'id' option to nfpxWindow()`);
// 	}

// 	const si_export_identifier = identifier_for_module(si_export);

// 	const f_filter = createFilter(gc_nfpm.include ?? './**/*.ts', gc_nfpm.exclude);

// 	// list of entrypoint files
// 	let a_entries: string[] = [];

// 	// typed hook helpers
// 	/* eslint-disable @typescript-eslint/no-unsafe-argument */
// 	const f_hooks = (y_hook: PluginContext, y_magic?: MagicString) => ({
// 		// typed overwrite
// 		f_replace: (y_node: BaseNode, sx_write: string) => y_magic?.overwrite((y_node as any).start, (y_node as any).end, sx_write),

// 		// typed warn
// 		// @ts-expect-error mistyped logging function
// 		f_warn: (s_msg: string, y_node?: BaseNode) => y_hook.warn(s_msg, (y_node as any)?.start),

// 		// typed error
// 		// @ts-expect-error mistyped logging function
// 		f_error: (s_msg: string, y_node?: BaseNode) => y_hook.error(s_msg, (y_node as any)?.start),
// 		/* eslint-enable */
// 	});

// 	// stored module data
// 	let g_nfp_modules_json: NfpModulesJson;
// 	let g_nfp_module: NfpModulesJson['modules'][string];

// 	// working module data
// 	let h_exports: Dict<WorkingExportEntry>;
// 	let h_dependencies: Dependencies;

// 	const load_nfp_modules_json = async(y_context: PluginContext) => {
// 		const g_json = g_nfp_modules_json = await loadNfpModulesJson(y_context);

// 		// ensure module def exists
// 		if(!g_json.modules[si_export]) {
// 			g_json.modules[si_export] = {
// 				version: '0.0',
// 				hash: '',
// 				exports: {
// 					'.': {},
// 				},
// 				dependencies: {},
// 			};
// 		}

// 		g_nfp_module = g_json.modules[si_export];
// 	};

// 	return {
// 		name: 'nfpx-modules',

// 		// // for exporting
// 		// async buildStart(gc_opts) {
// 		// 	a_entries = [];

// 		// 	// load nfp modules json
// 		// 	await load_nfp_modules_json(this);

// 		// 	// reset working data, copy the exports from the json so as not to overwrite stored version
// 		// 	h_exports = fodemtv(g_nfp_module.exports['.'], g_entry => ({...g_entry}));
// 		// 	h_dependencies = {};

// 		// 	if(gc_nfpm.importsOnly) return;

// 		// 	// parse inputs
// 		// 	if(Array.isArray(gc_opts.input)) {
// 		// 		a_entries = gc_opts.input.map(sr_file => path.resolve(sr_file));
// 		// 	}
// 		// 	else if('object' === typeof gc_opts.input) {
// 		// 		for(const [, sr_file] of ode(gc_opts.input)) {
// 		// 			a_entries.push(path.resolve(sr_file));
// 		// 		}
// 		// 	}
// 		// 	else {
// 		// 		throw new Error(`Failed to determine type of RollupOptions.input; expected string[] or object`);
// 		// 	}
// 		// },

// 		// for importing
// 		async resolveId(si_specifier, si_importer, gc_resolve) {
// 			if(SI_B93_EXPORT === si_specifier) {
// 				return {
// 					id: SI_B93_EXPORT,
// 					moduleSideEffects: true,
// 				};
// 			}
// 			// importer is attempting to statically import an nfp module
// 			else if(si_specifier.endsWith(SI_B93_SPECIFIER_SUFFIX)) {
// 				// mark the specifier as a module to import
// 				return {
// 					id: SI_B93_IMPORT+si_specifier.slice(-SI_B93_SPECIFIER_SUFFIX.length),
// 					moduleSideEffects: true,
// 				};
// 			}
// 		},

// 		// for importing
// 		load(si_module) {
// 			const {
// 				f_error,
// 			} = f_hooks(this);

// 			if(si_module === SI_B93_EXPORT) {

// 			}
// 			// statically importing an nfp module
// 			else if(si_module.startsWith(SI_B93_IMPORT)) {
// 				// get the module's id
// 				const si_nfpx = si_module.slice(SI_B93_IMPORT.length);

// 				// lookup its exports
// 				const g_nfpx_json = g_nfp_modules_json.modules[si_nfpx];

// 				// not found
// 				if(!g_nfpx_json) {
// 					return f_error(`Failed to read NFP module exports for ${si_nfpx}; did you build the module first?`);
// 				}

// 				// debugger;
// 				h_dependencies[si_nfpx] = Object.assign(h_dependencies[si_nfpx] || {}, {
// 					version: g_nfpx_json.version,
// 					hash: g_nfpx_json.hash,
// 					// imports: h_dependencies[si_import].imports || {},
// 				});

// 				const a_destructures: string[] = [];
// 				const a_aliases: string[] = [];

// 				// exports for this module
// 				const h_module = g_nfpx_json.exports['.'];

// 				if(!h_module) {
// 					return f_error(`Corrupt nfpx json file ${SR_NFP_MODULES_JSON}; missing default exports for ${si_nfpx} module`);
// 				}

// 				for(const [si_alias, g_entry] of ode(h_module)) {
// 					a_destructures.push('\n'+'\t'.repeat(6)+`${g_entry.symbol}:${si_alias}`);
// 					a_aliases.push(si_alias);
// 				}

// 				// create the virtual module with exports to be bundled into the importer
// 				return unindent(`
// 					// load exports from module via its reserved property id on window
// 					const h_exports = window.${identifier_for_module(si_nfpx)};

// 					${a_destructures.length? `
// 						// destructure exports
// 						const {${a_destructures.join(',')}
// 						} = h_exports;
// 					`: ''}

// 					// default export
// 					export default h_exports;

// 					// tree-shakeable export
// 					export {${a_aliases.join(',')}};
// 				`);
// 			}
// 			else if(si_module.endsWith(SI_SUFFIX)) {
// 				const si_entry = si_module.slice(0, -SI_SUFFIX.length);

// 				const b_default = this.getModuleInfo(si_entry)?.hasDefaultExport;

// 				let sx_out = `
// 					import ${JSON.stringify(SI_B93_EXPORT)};
// 					export * from ${JSON.stringify(si_entry)}
// 				`;

// 				if(b_default) {
// 					sx_out += `export {default} from ${JSON.stringify(si_entry)};`;
// 				}

// 				return sx_out;
// 			}

// 			return null;
// 		},


// 		// for exporting
// 		async generateBundle(gc_output, h_bundle) {
// 			if(gc_nfpm.importsOnly) return;

// 			// update json before serializing
// 			await load_nfp_modules_json(this);

// 			// search bundle for entry chunk
// 			for(const [, g_chunk] of ode(h_bundle)) {
// 				// found it
// 				if('chunk' === g_chunk.type && g_chunk.isEntry) {
// 					// locate the corresponding entry path
// 					for(const p_entry of a_entries) {
// 						const si_facade = g_chunk.facadeModuleId;

// 						// matched facade to path
// 						if(si_facade && p_entry.endsWith(si_facade.replace(/\?.*$/, ''))) {
// 							const h_exports_stored = g_nfp_module.exports['.'];

// 							// detect non-breaking minor changes
// 							let b_feature = false;

// 							// compare exports from stored to live
// 							for(const [si_alias, g_entry_stored] of ode(h_exports_stored)) {
// 								const g_entry_live = h_exports[si_alias];

// 								// export was deleted
// 								if(!g_entry_live) {
// 									return this.error(`Breaking change detected; the ${si_export} module used to export ${si_alias} but the source no longer appears to include this member.`);
// 								}
// 								// export changed from static to dynamic
// 								else if(!g_entry_stored.dynamic && g_entry_live.dynamic) {
// 									return this.error(`Breaking change detected; the ${si_export} module used to statically export ${si_alias} but now appears to export it dynamically.`);
// 								}
// 								// symbol changed
// 								else if(g_entry_stored.symbol !== g_entry_live.symbol) {
// 									return this.error(`Something went wrong, stopped before overwriting the ${si_alias} export symbol from "${g_entry_stored.symbol}" to "${g_entry_live.symbol}" in the ${si_export} module`);
// 								}
// 							}

// 							// compare exports from live to stored
// 							for(const [si_alias, g_entry_live] of ode(h_exports)) {
// 								const g_entry_stored = h_exports_stored[si_alias];

// 								// new export
// 								if(!g_entry_stored) {
// 									b_feature = true;
// 									break;
// 								}
// 								// change from dynamic to static
// 								else if(g_entry_stored.dynamic !== g_entry_live.dynamic) {
// 									b_feature = true;
// 									break;
// 								}
// 							}

// 							// remove working data
// 							for(const [si_alias, g_entry_live] of Object.entries(h_exports)) {
// 								delete g_entry_live.init;
// 							}

// 							// overwrite exports, preserving existing order
// 							h_exports = Object.assign(g_nfp_module.exports['.'], h_exports);

// 							// compute hash
// 							g_nfp_module.hash = buffer_to_hex(await sha256(text_to_buffer(JSON.stringify(h_exports)))).slice(0, 12);

// 							// parse version and then re-serialize
// 							const [n_major, n_minor] = g_nfp_module.version.split('.').map(s => +s);
// 							g_nfp_module.version = [n_major, n_minor + (b_feature? 1: 0)].join('.') as `${bigint}.${bigint}`;

// 							// update dependencies
// 							g_nfp_module.dependencies = h_dependencies;

// 							// can stop searching
// 							break;
// 						}
// 					}
// 				}
// 			}

// 			// replace file
// 			await fs.writeFile(SR_NFP_MODULES_JSON, JSON.stringify(g_nfp_modules_json, null, '\t'));

// 			return;
// 		},
// 	};
// }

// export default nfpxWindow;

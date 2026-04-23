import { writable } from "svelte/store";

/** When true, the global header is hidden (e.g. collection pages render their own) */
export const hideGlobalHeader = writable(false);

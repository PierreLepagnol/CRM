/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as auth from "../auth.js";
import type * as contacts from "../contacts.js";
import type * as contrats from "../contrats.js";
import type * as dashboard from "../dashboard.js";
import type * as deals from "../deals.js";
import type * as exports from "../exports.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_validators from "../lib/validators.js";
import type * as privateData from "../privateData.js";
import type * as reunions from "../reunions.js";
import type * as search from "../search.js";
import type * as societes from "../societes.js";
import type * as tags from "../tags.js";
import type * as tasks from "../tasks.js";
import type * as today from "../today.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  auth: typeof auth;
  contacts: typeof contacts;
  contrats: typeof contrats;
  dashboard: typeof dashboard;
  deals: typeof deals;
  exports: typeof exports;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/validators": typeof lib_validators;
  privateData: typeof privateData;
  reunions: typeof reunions;
  search: typeof search;
  societes: typeof societes;
  tags: typeof tags;
  tasks: typeof tasks;
  today: typeof today;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};

import {
  Config as IncorrectVerdaccioConfig,
  PackageAccess as IncorrectVerdaccioPackageAccess,
  Security,
} from "@verdaccio/types"
import get from "lodash/get"
import assert from "ow"
import process from "process"
import { PartialDeep, RemoveIndexSignature } from "type-fest"
import { pluginKey } from "../../constants"
import { logger } from "../../logger"

//
// Types
//

// Verdaccio incorrectly types some of these as string arrays
// although they are all strings.
export interface PackageAccess extends IncorrectVerdaccioPackageAccess {
  unpublish?: string[]
}

export type VerdaccioConfig = Omit<
  RemoveIndexSignature<IncorrectVerdaccioConfig>,
  "packages" | "security"
> & {
  packages?: Record<string, PackageAccess>
  security?: PartialDeep<Security>
}

export interface PluginConfig {
  "client_id": string
  "client_secret": string
  "authorization_endpoint": string
  "token_endpoint": string
  "scope": string
  "name_claim": string
  "roles_claim": string
}

export interface Config extends VerdaccioConfig {
  middlewares: { [key: string]: PluginConfig }
  auth: { [key: string]: PluginConfig }
}

/**
 * e.g. "5.0.4" --> 5
 */
export function getMajorVersion() {
  const version = require("verdaccio/package.json").version
  return +version.replace(/^(\d+).\d+.\d+$/, "$1")
}

//
// Validation
//

function validateVersion() {
  const majorVersion = getMajorVersion()

  if (majorVersion < 5) {
    throw new Error("This plugin requires verdaccio 5 or above")
  }
}

function validateNodeExists(config: Config, node: keyof Config) {
  const path = `[${node}][${pluginKey}]`
  const obj = get(config, path, {})

  if (!Object.keys(obj).length) {
    throw new Error(`"${node}.${pluginKey}" must be enabled`)
  }
}

function getEnvValue(name: any) {
  const value = process.env[String(name)]
  if (value === "true" || value === "false") {
    return value === "true"
  }
  return value
}

function getConfigValue<T>(config: Config, key: string, predicate: any): T {
  let valueOrEnvName =
    get(config, ["auth", pluginKey, key]) ??
    get(config, ["middlewares", pluginKey, key])

  const value = getEnvValue(valueOrEnvName) ?? valueOrEnvName

  try {
    assert(value, predicate)
  } catch (error) {
    logger.error(
      `Invalid configuration at "auth.${pluginKey}.${key}": ${error.message} — Please check your verdaccio config.`,
    )
    process.exit(1)
  }

  return value as T
}

//
// Access
//

export class ParsedPluginConfig {
  public readonly packages = this.config.packages ?? {}
  public readonly url_prefix = this.config.url_prefix ?? ""

  public readonly clientId = getConfigValue<string>(
    this.config,
    "client_id",
    assert.string.nonEmpty,
  )

  public readonly clientSecret = getConfigValue<string>(
    this.config,
    "client_secret",
    assert.string.nonEmpty,
  )

  public readonly authorizationEndpoint = getConfigValue<string>(
      this.config,
      "authorization_endpoint",
      assert.string.nonEmpty,
    )

  public readonly tokenEndpoint = getConfigValue<string>(
      this.config,
      "token_endpoint",
      assert.string.nonEmpty,
    )

  public readonly scope = getConfigValue<string>(
      this.config,
      "scope",
      assert.string.nonEmpty,
    )

  public readonly nameClaim = getConfigValue<string>(
      this.config,
      "name_claim",
      assert.string.nonEmpty,
    )

  public readonly rolesClaim = getConfigValue<string>(
      this.config,
      "roles_claim",
      assert.string.nonEmpty,
    )

  constructor(public readonly config: Config) {
    validateVersion()

    validateNodeExists(config, "middlewares")
    validateNodeExists(config, "auth")
  }
}

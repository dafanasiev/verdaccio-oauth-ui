import { Request } from "express"
import { stringify } from "querystring"

import { AuthProvider } from "../plugin/AuthProvider"
import { Config, getConfig } from "../plugin/Config"

import { getPublicUrl } from "verdaccio/build/lib/utils"
import { getCallbackPath } from "../../redirect"

import jwtDecode from './jwt-decode'

import got from "got"

export class GitHubAuthProvider implements AuthProvider {
  private readonly client_id = getConfig(this.config, "client_id")
  private readonly client_secret = getConfig(this.config, "client_secret")
  private readonly authorization_endpoint = getConfig(this.config, "authorization_endpoint")
  private readonly token_endpoint = getConfig(this.config, "token_endpoint")
  private readonly scope = getConfig(this.config, "scope")
  private readonly name_claim = getConfig(this.config, "name_claim")
  private readonly roles_claim = getConfig(this.config, "roles_claim")

  constructor(private readonly config: Config) {}

  getId() {
    return "github"
  }

  getLoginUrl(callbackUrl: string) {
    const queryParams = stringify({
      client_id: this.client_id,
      redirect_uri: callbackUrl,
      scope: this.scope,
      response_type: 'code',
      response_mode: 'query',
    })

    return this.authorization_endpoint + `?` + queryParams
  }

  async getToken(req: Request) {
    const options = {
      method: "POST",
      form: {
        grant_type: 'authorization_code',
        code: req.query.code as string,
        client_id: this.client_id,
        client_secret: this.client_secret,
        redirect_uri: this.getRedirectUrl(req),
      },
    } as const

    try {
      const rv = await got(this.token_endpoint, options).json()
      return rv.access_token;
    } catch (error) {
      throw new Error("Failed requesting GitHub access token: " + error.message)
    }
  }

  async getUsername(token: string) {
    const decodedBody = jwtDecode(token);
    const rv = decodedBody[this.name_claim];
    return rv;
  }

  async getGroups(token: string) {
    const decodedBody = jwtDecode(token);
    let rv = decodedBody[this.roles_claim];
    if (rv && typeof rv === 'string') {
      rv = rv.split(',').map(v=>v.trim());
    }
    return rv || [];
  }

  private getRedirectUrl(req: Request): string {
    const baseUrl = getPublicUrl(this.config.url_prefix, req).replace(/\/$/, "")
    const path = getCallbackPath(req.params.id)
    const redirectUrl = baseUrl + path

    return redirectUrl
  }

}

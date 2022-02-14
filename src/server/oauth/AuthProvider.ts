import { Request } from "express"
import { stringify } from "querystring"

import { AuthProvider } from "../plugin/AuthProvider"
import { ParsedPluginConfig } from "../plugin/Config"

import { getPublicUrl } from "verdaccio/build/lib/utils"
import { getCallbackPath } from "../../redirect"

import jwtDecode from './jwt-decode'

import fetch from "node-fetch"

export class OAuth2AuthProvider implements AuthProvider {

  constructor(private readonly config: ParsedPluginConfig) {}

  getId() {
    return "github"
  }

  getLoginUrl(callbackUrl: string) {
    const queryParams = stringify({
      client_id: this.config.clientId,
      redirect_uri: callbackUrl,
      scope: this.config.scope,
      response_type: 'code',
      response_mode: 'query',
    })

    return this.config.authorizationEndpoint + `?` + queryParams
  }

  async getToken(req: Request) {
    try {
      const resp = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `grant_type=authorization_code&code=${encodeURIComponent(req.query.code as string)}&client_id=${encodeURIComponent(this.config.clientId)}` +
              `&client_secret=${encodeURIComponent(this.config.clientSecret)}&redirect_uri=${encodeURIComponent(this.getRedirectUrl(req))}`
      });
      if(!resp.ok) {
        throw new Error(`unable to fetch token from SSO, return status:${resp.status}`);
      }
      const rv = await resp.json();
      return (rv as any).access_token;
    } catch (error) {
      throw new Error("Failed requesting SSO access token: " + error.message)
    }
  }

  async getUsername(token: string) {
    const decodedBody = jwtDecode(token);
    const rv = decodedBody[this.config.nameClaim];
    return rv;
  }

  async getGroups(token: string) {
    const decodedBody = jwtDecode(token);
    let rv = decodedBody[this.config.rolesClaim];
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

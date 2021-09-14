<h1 align="center">
  📦🔐 Verdaccio OAuth - With UI Support
</h1>

Fork of `n4bb12/verdaccio-github-oauth-ui` with **small** modifications for support OIDC server (where `access_token` encoded in JWT).

## Example config
```yaml
#
# Look here for more config file examples:
# https://github.com/verdaccio/verdaccio/tree/master/conf
#

storage: ./storage
plugins: ./plugins

middlewares:
  oauth-ui:
    enabled: true

auth:
  oauth-ui:
    authorization_endpoint: "https://sso.company.com/auth/realms/master/protocol/openid-connect/auth"
    token_endpoint: "https://sso.company.com/auth/realms/master/protocol/openid-connect/token"
    client_id: "npm"
    client_secret: "SOME_SECRET_FROM_SSO_CONFIGURATION"
    scope: "openid profile"
    name_claim: "preferred_username"
    roles_claim: "roles"              # string (comma-separated) or array of string

security:
  api:
    jwt:
      sign:
        expiresIn: 90d
  web:
    sign:
      expiresIn: 7d

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  "@*/*":
    access: $authenticated
    publish: $authenticated
    proxy: npmjs

  "**":
    access: $authenticated
    publish: $authenticated
    proxy: npmjs
```

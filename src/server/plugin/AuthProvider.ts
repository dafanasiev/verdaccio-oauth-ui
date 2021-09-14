import { Request } from "express"

export interface AuthProvider {
  getId(): string
  getLoginUrl(callbackUrl: string): string
  //getCode(req: Request): string

  getToken(req: Request): Promise<string>
  getUsername(token: string): Promise<string>
  getGroups(token: string): Promise<string[]>
}

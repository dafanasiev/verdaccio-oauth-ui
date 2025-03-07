import { IPluginMiddleware } from "@verdaccio/types"
import { Application, Handler } from "express"
import { readFileSync } from "fs"
import { publicRoot, staticPath } from "../../constants"
import { Verdaccio } from "./Verdaccio"

/**
 * Injects additional static imports into the DOM with code from the client folder
 * that modifies the login button.
 */
export class PatchHtml implements IPluginMiddleware<any> {
  private readonly scriptTag = `<script src="${staticPath}/verdaccio-5.js"></script>`
  private readonly styleTag = `<style>${readFileSync(
    `${publicRoot}/verdaccio-5.css`,
  )}</style>`
  private readonly headWithStyle = [this.styleTag, "</head>"].join("")
  private readonly bodyWithScript = [this.scriptTag, "</body>"].join("")

  constructor(private readonly verdaccio: Verdaccio) {}

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application) {
    app.use(this.patchResponse)
  }

  /**
   * Patches `res.send` in order to inject style and script tags.
   */
  patchResponse: Handler = (req, res, next) => {
    const send = res.send
    res.send = (html) => {
      html = this.insertTags(html)
      return send.call(res, html)
    }
    next()
  }

  private insertTags = (html: string | Buffer): string => {
    html = String(html)
    if (!html.includes("__VERDACCIO_BASENAME_UI_OPTIONS")) {
      return html
    }
    return html
      .replace(/<\/head>/, this.headWithStyle)
      .replace(/<\/body>/, this.bodyWithScript)
  }
}

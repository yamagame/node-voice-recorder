import { Recorder } from "~/recorder"

export function start_server(recorder: Recorder, port: number) {
  const app = require("http").createServer(handler)

  function requestHandler(req, callback) {
    let buf = Buffer.from([])
    req.on("data", (data) => {
      buf = Buffer.concat([buf, data])
    })
    req.on("close", () => {})
    req.on("end", () => {
      callback(buf.toString())
    })
  }

  function handler(req, res) {
    if (req.method === "POST") {
      const url = require("url").parse(req.url)
      const params = require("querystring").parse(url.search)
      req.params = params

      // curl -X POST http://localhost:3093/listen/start
      if (url.pathname === "/listen/start") {
        return requestHandler(req, () => {
          console.log("listen start")
          recorder.recording = true
          res.end("OK\n")
        })
      }

      // curl -X POST http://localhost:3093/listen/stop
      if (url.pathname === "/listen/stop") {
        return requestHandler(req, () => {
          console.log("listen stop")
          recorder.recording = false
          res.end("OK\n")
        })
      }
    }
  }

  app.listen(port, () => {
    console.log(`node-voice-recorder listening on port ${port}!`)
  })
}

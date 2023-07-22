import * as fs from "fs"
import * as path from "path"
import { Recorder } from "~/recorder"
import sampleToWavAudio from "~/wav"
import fetch from "node-fetch"

function main() {
  const recorder = new Recorder()
  let count = 0
  let delay = 0
  let buffer = []
  let recording = false
  recorder.on("voice_stop", () => {
    console.log("voice_stop")
    delay = 5
  })
  recorder.on("voice_start", () => {
    recording = true
    console.log("voice_start")
  })
  recorder.on("data", (event) => {
    buffer.push(event.data)
    if (!recording) {
      buffer = buffer.slice(-3)
    }
  })
  setInterval(async () => {
    if (delay > 0) {
      delay--
      if (delay === 0 && recording) {
        recording = false
        const wavdata = sampleToWavAudio(buffer, {
          sampleSize: 16,
          sampleRate: 48000,
          channelCount: 1,
        })
        const fpath = path.join("./work", `${count++}.wav`)
        fs.writeFile(fpath, wavdata, (err) => {
          if (err) throw err
          console.log("The file has been saved!")
        })
        const res = await fetch("http://127.0.0.1:9002/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: path.basename(fpath) }),
        })
        console.log(await res.json())
        buffer = buffer.slice(-3)
      }
    }
  }, 100)
  // const outputFileStream = fs.createWriteStream("./work/output.wav")
  // recorder.micInputStream.pipe(outputFileStream)
}

if (require.main === module) {
  main()
}

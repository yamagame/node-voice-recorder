import * as fs from "fs"
import * as path from "path"
import { Recorder } from "~/recorder"
import sampleToWavAudio from "~/wav"
import fetch from "node-fetch"
import * as dayjs from "dayjs"

const REAZONSPEECH_HOST = process.env["REAZONSPEECH_HOST"] || "http://127.0.0.1:9002"

function printmsg(msg: string) {
  process.stdout.clearLine(0)
  process.stdout.write(msg)
  process.stdout.cursorTo(0)
}

const timeform = "YYYY/MM/DD hh:mm:ss"

function main() {
  const recorder = new Recorder()
  let count = 0
  recorder.on("voice_stop", () => {
    printmsg("voice_stop")
  })
  recorder.on("voice_start", () => {
    printmsg("voice_start")
  })
  recorder.on("transcribe", async (event) => {
    const buffer = event.data
    const wavdata = sampleToWavAudio(buffer, {
      sampleSize: 16,
      sampleRate: 48000,
      channelCount: 1,
    })
    const fpath = path.join("./work", `${count++}.wav`)
    fs.writeFile(fpath, wavdata, (err) => {
      if (err) throw err
    })
    printmsg("start_transcribe")
    const res = await fetch(`${REAZONSPEECH_HOST}/wav/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: path.basename(fpath) }),
    })
    process.stdout.clearLine(0)
    console.log(
      JSON.stringify({
        timestamp: dayjs(event.timestamp).format(timeform),
        action: "transcribe",
        ...(await res.json()),
      })
    )
  })
  console.log(JSON.stringify({ timestamp: dayjs(Date()).format(timeform), action: "start" }))
}

if (require.main === module) {
  main()
}

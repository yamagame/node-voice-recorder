import * as fs from "fs"
import * as path from "path"
import * as readline from "readline"
import { Recorder } from "~/recorder"
import { sampleToWavAudio, audioSettings } from "~/wav"
import fetch from "node-fetch"
import * as dayjs from "dayjs"
import { Logger } from "~/logger"
import { ulid } from "ulid"

const REAZONSPEECH_HOST = process.env["REAZONSPEECH_HOST"] || "http://127.0.0.1:9002"
const REAZONSPEECH_WORK = process.env["REAZONSPEECH_WORK"] || "./work"
const REAZONSPEECH_RAW = process.env["REAZONSPEECH_RAW"] || ""
const REAZONSPEECH_LOGFILE = process.env["REAZONSPEECH_LOGFILE"] || ""

const logger = new Logger({ outdir: REAZONSPEECH_WORK, logfile: REAZONSPEECH_LOGFILE })

const timeform = "YYYY/MM/DD hh:mm:ss"

function main() {
  const rawfile = REAZONSPEECH_RAW
  const rawprop: { rawfile?: string } = {}
  if (rawfile != "") {
    rawprop.rawfile = `${path.basename(rawfile, path.extname(rawfile))}-${ulid()}${path.extname(
      rawfile
    )}`
  }
  const recorder = new Recorder()
  recorder.on("voice_stop", () => {
    logger.print("voice_stop")
  })
  recorder.on("voice_start", () => {
    logger.print("voice_start")
  })
  recorder.on("transcribe", async (event) => {
    const buffer = event.data
    const wavdata = sampleToWavAudio(
      buffer,
      new audioSettings({
        sampleSize: 16,
        sampleRate: 48000,
        channelCount: 1,
      })
    )
    const filename = `${logger.filename()}.wav`
    const fpath = path.join(REAZONSPEECH_WORK, filename)
    fs.writeFile(fpath, wavdata, (err) => {
      if (err) throw err
    })
    logger.print("start_transcribe")
    const res = await fetch(`${REAZONSPEECH_HOST}/wav/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    })
    logger.clearLine()
    logger.log({
      timestamp: dayjs(event.timestamp).format(timeform),
      action: "transcribe",
      ...rawprop,
      ...(await res.json()),
    })
  })
  if (rawprop.rawfile) {
    const outputFileStream = fs.createWriteStream(path.join(REAZONSPEECH_WORK, rawprop.rawfile))
    recorder.micInputStream.pipe(outputFileStream)
  }
  logger.log({ timestamp: dayjs(Date()).format(timeform), action: "start", ...rawprop })

  const r = readline.createInterface({
    input: process.stdin,
    terminal: false,
  })

  let toggle = true
  recorder.recording = toggle

  r.on("line", (line) => {
    toggle = !toggle
    recorder.recording = toggle
    if (toggle) {
      logger.print("ReazonSpeech ON")
    } else {
      logger.print("ReazonSpeech OFF")
    }
  })
}

if (require.main === module) {
  main()
}

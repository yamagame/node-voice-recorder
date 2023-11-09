import * as fs from "fs"
import * as path from "path"
import * as readline from "readline"
import { Recorder } from "~/recorder"
import { sampleToWavAudio, audioSettings } from "~/wav"
import fetch from "node-fetch"
import * as dayjs from "dayjs"
import { Logger } from "~/logger"
import { ulid } from "ulid"
import { start_server } from "~/server"
import { ngword } from "./ngword"

const REAZONSPEECH_HOST = process.env["REAZONSPEECH_HOST"] || "http://127.0.0.1:9002"
const REAZONSPEECH_WORK = process.env["REAZONSPEECH_WORK"] || "./work"
const REAZONSPEECH_RAW = process.env["REAZONSPEECH_RAW"] || ""
const REAZONSPEECH_LOGFILE = process.env["REAZONSPEECH_LOGFILE"] || ""
const AGENT_HOST = process.env["AGENT_HOST"] || ""
const VOICE_RECORDER_SERVER_PORT = process.env["VOICE_RECORDER_SERVER_PORT"] || "0"
const VOICE_RECORDER_ENERGY_POS = process.env["VOICE_RECORDER_ENERGY_POS"] || "2"
const VOICE_RECORDER_ENERGY_NEG = process.env["VOICE_RECORDER_ENERGY_NEG"] || "0.5"

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
  const recorder = new Recorder({
    energyThresholdRatioPos: parseFloat(VOICE_RECORDER_ENERGY_POS),
    energyThresholdRatioNeg: parseFloat(VOICE_RECORDER_ENERGY_NEG),
  })
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
    const payload = await res.json()
    const data = {
      timestamp: dayjs(event.timestamp).format(timeform),
      action: "transcribe",
      ...rawprop,
      ...(payload as any),
    }
    logger.log(data)
    if (AGENT_HOST != "") {
      const { text } = payload
      if (ngword.indexOf(text) < 0) {
        try {
          await fetch(`${AGENT_HOST}/transcribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          recorder.recording = false
        } catch (err) {
          console.error(err)
        }
      }
    }
  })
  if (rawprop.rawfile) {
    const outputFileStream = fs.createWriteStream(path.join(REAZONSPEECH_WORK, rawprop.rawfile))
    recorder.micInputStream.pipe(outputFileStream)
  }

  const r = readline.createInterface({
    input: process.stdin,
    terminal: false,
  })

  let toggle = true

  if (VOICE_RECORDER_SERVER_PORT !== "0") {
    toggle = false
    start_server(recorder, parseInt(VOICE_RECORDER_SERVER_PORT))
  }

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

  if (recorder.recording) {
    logger.log({ timestamp: dayjs(Date()).format(timeform), action: "start", ...rawprop })
  }
}

if (require.main === module) {
  main()
}

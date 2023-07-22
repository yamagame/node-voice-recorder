import { EventEmitter } from "events"
import Mic from "~/mic"
import Vad from "~/vad"
import DFT from "~/dtf"
import { MinMax } from "~/utils"

export class Recorder extends EventEmitter {
  private _micInputStream: any

  constructor() {
    super()

    // VAD のオプション設定 (詳細後述)
    const VadOptions = new Vad.VADProps()
    // 音声区間検出開始時ハンドラ
    VadOptions.voice_stop = () => {
      this.emit("voice_stop")
    }
    // 音声区間検出終了時ハンドラ
    VadOptions.voice_start = () => {
      this.emit("voice_start")
    }

    const vad = new Vad.VAD(VadOptions)
    const micInstance = new Mic({
      rate: "48000",
      channels: "1",
      debug: false,
      exitOnSilence: 0,
      encoding: "signed-integer",
      fileType: "raw",
      endian: "big",
    })

    const micInputStream = micInstance.getAudioStream()

    // let chunkCounter = 0
    const sampleData = []
    let n = 0
    const minmax1 = new MinMax("sample")
    const minmax2 = new MinMax("fft")
    micInputStream.on("data", (data) => {
      const buffer = new Int16Array(data.length / 2)
      // console.log("Recieved Input Stream of Size %d: %d", data.length, chunkCounter++)
      let speechSample = 0
      minmax1.reset()
      for (let i = 0; i < data.length; i += 2) {
        if (data[i] > 128) {
          speechSample = (data[i] - 256) * 256
        } else {
          speechSample = data[i] * 256
        }
        speechSample += data[i + 1]
        buffer[i / 2] = speechSample
        sampleData[n] = speechSample / 0x7fff
        minmax1.set(sampleData[n])
        n++
        if (n >= vad.floatFrequencyData.length * 2) {
          // console.log(sampleData.length)
          DFT.fftHighSpeed(vad.floatFrequencyData.length, sampleData)
          minmax2.reset()
          for (let i = 0; i < sampleData.length; i += 2) {
            const o = sampleData[i]
            const q = sampleData[i + 1]
            const v = Math.sqrt(o * o + q * q)
            minmax2.set(v)
            vad.floatFrequencyData[i / 2] = v / 1000
          }
          // minmax2.print()
          vad.update()
          vad.monitor()
          n = 0
        }
      }
      this.emit("data", { data: buffer })
      // minmax1.print()
    })

    micInputStream.on("error", function (err) {
      console.log("Error in Input Stream: " + err)
    })

    micInputStream.on("startComplete", function () {
      console.log("Got SIGNAL startComplete")
    })

    micInputStream.on("stopComplete", function () {
      console.log("Got SIGNAL stopComplete")
    })

    micInputStream.on("pauseComplete", function () {
      console.log("Got SIGNAL pauseComplete")
    })

    micInputStream.on("resumeComplete", function () {
      console.log("Got SIGNAL resumeComplete")
    })

    micInputStream.on("silence", function () {
      console.log("Got SIGNAL silence")
    })

    micInputStream.on("processExitComplete", function () {
      console.log("Got SIGNAL processExitComplete")
    })

    micInstance.start()

    this._micInputStream = micInputStream
  }

  get micInputStream() {
    return this._micInputStream
  }
}

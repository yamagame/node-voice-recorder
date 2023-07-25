import { EventEmitter } from "events"
import Mic from "~/mic"
import Vad from "~/vad"
import DFT from "~/dtf"
import { MinMax } from "~/utils"

export class Recorder extends EventEmitter {
  private _micInputStream: any
  recording: boolean = false
  delay: number = 0
  buffers: Int16Array[] = []

  constructor() {
    super()

    // VAD のオプション設定 (詳細後述)
    const VadOptions = new Vad.VADProps()
    // 音声区間検出開始時ハンドラ
    VadOptions.voice_stop = () => {
      this.emit("voice_stop")
      this.delay = 15
    }
    // 音声区間検出終了時ハンドラ
    VadOptions.voice_start = () => {
      this.recording = true
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
      this.buffers.push(buffer)
      if (this.delay > 0) {
        this.delay--
        if (this.delay === 0 && this.recording) {
          this.transcribe()
          this.recording = false
          this.buffers = this.buffers.slice(-3)
        }
      } else if (!this.recording) {
        this.buffers = this.buffers.slice(-3)
      }
      this.emit("data", { data: buffer })
      // minmax1.print()
    })

    micInputStream.on("error", function (err) {
      console.log("Error in Input Stream: " + err)
    })

    micInputStream.on("startComplete", () => {
      console.log("Got SIGNAL startComplete")
    })

    micInputStream.on("stopComplete", () => {
      console.log("Got SIGNAL stopComplete")
    })

    micInputStream.on("pauseComplete", () => {
      console.log("Got SIGNAL pauseComplete")
    })

    micInputStream.on("resumeComplete", () => {
      console.log("Got SIGNAL resumeComplete")
    })

    micInputStream.on("silence", () => {
      console.log("Got SIGNAL silence")
    })

    micInputStream.on("processExitComplete", () => {
      console.log("Got SIGNAL processExitComplete")
    })

    micInstance.start()

    this._micInputStream = micInputStream
  }

  get micInputStream() {
    return this._micInputStream
  }

  transcribe() {
    const sampleCount = this.buffers.reduce((memo: number, buffer: Int16Array) => {
      return memo + buffer.length
    }, 0)
    const dataView = new Int16Array(sampleCount)
    let n = 0
    for (const buffer of this.buffers) {
      for (const value of buffer) {
        dataView[n] = value
        n++
      }
    }
    this.emit("transcribe", { timestamp: Date(), action: "transcribe", data: dataView })
  }
}

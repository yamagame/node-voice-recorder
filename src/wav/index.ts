import * as fs from "fs"
import { sampleToWavAudio } from "./genwav"
import * as process from "node:process"

export default sampleToWavAudio

function main() {
  const rawfile = process.argv[2]
  const outfile = process.argv[3]
  const rawbinary = fs.readFileSync(rawfile)
  const wavefile = sampleToWavAudio(new Int16Array(rawbinary), {
    sampleSize: 16,
    sampleRate: 48000,
    channelCount: 1,
  })
  fs.writeFileSync(outfile, wavefile)
}

if (require.main === module) {
  main()
}

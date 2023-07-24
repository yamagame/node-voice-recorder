import * as fs from "fs"
import * as path from "path"
import { sampleToWavAudio } from "./genwav"
import * as process from "node:process"

export default sampleToWavAudio

function main() {
  const rawfile = process.argv[2]
  const p = path.parse(rawfile)
  const outfile = process.argv[3] || path.join(p.dir, `${p.name}.wav`)
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

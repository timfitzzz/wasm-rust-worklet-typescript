import init, { WasmPitchDetector } from "./wasm-tuner/wasm_tuner"

interface WasmMessageEvent extends MessageEvent {
  wasmBytes: BufferSource
  sampleRate: number
  numAudioSamplesPerAnalysis: number
}
class PitchProcessor extends AudioWorkletProcessor {
  
  public samples: Float32Array
  public totalSamples: number
  public detector: WasmPitchDetector | null

  private numAudioSamplesPerAnalysis: number = 0
  
  constructor() {
    super();
    // Initialize buffer of samples for later analysis
    this.samples = new Float32Array()

    // Initialize starting number of samples
    this.totalSamples = 0
    this.port.onmessage = (event) => this.onmessage(event.data);
    
    this.detector = null
  }

  private onmessage = (event: WasmMessageEvent) => {
    if (event.type === 'send-wasm-module') {
      // the audioworkletnode sends a message containing the wasm library
      // and information about the audio device tree.
      init(WebAssembly.compile(event.wasmBytes)).then(() => {
        this.port.postMessage({ type: 'wasm-module-loaded'});
      });
    } else if (event.type === 'init-detector') {
      const { sampleRate, numAudioSamplesPerAnalysis: sampleCount } = event;

      // note number of audio samples per event (webaudio = 128 i think)
      this.numAudioSamplesPerAnalysis = sampleCount
      this.detector = WasmPitchDetector.new(sampleRate, sampleCount);

      // create input buffer
      this.samples = new Float32Array(sampleCount).fill(0)
    }
  }

  process(inputs: Float32Array[][], 
          outputs: Float32Array[][], 
          parameters: Record<string, Float32Array>
          ): boolean {
    // inputs = new audio samples. if stereo, two arrays
    // outputs = in this case, same audio samples as inputs

    const inputChannels = inputs[0];
    const inputSamples = inputChannels[0]
    // WebAudioApi calls process every 128 samples, so assume
    // size of inputSamples is >= 128 and a power of two.

    // if we have not yet filled the sample buffer, we'll simply
    // copy each new sample into it.
    if (this.totalSamples < this.numAudioSamplesPerAnalysis) {
      for (const sampleValue of inputSamples) {
        this.samples[this.totalSamples++] = sampleValue
      }
    } else {
      // If the buffer is full, cycle out old samples and cycle in new ones:
      const numNewSamples = inputSamples.length // # we're adding
      const numExistingSamples = this.samples.length - numNewSamples; // # we're keeping

      // copy latest old samples in excess of new sample count
      // to start of this.samples.
      for (let i = 0; i < numExistingSamples; i++) {
        this.samples[i] = this.samples[i + numNewSamples];
      }

      // add new samples onto end of buffer
      for (let i = 0; i < numNewSamples; i++) {
        this.samples[numExistingSamples + i] = inputSamples[i];
      }

      // add to total sample count, although it's just trivia once
      // the buffer has filled for the first time.
      this.totalSamples += inputSamples.length
    }

    // if we have enough samples and the pitch detector is ready, call it.
    if (this.totalSamples >= this.numAudioSamplesPerAnalysis && this.detector) {
      const result = this.detector.detect_pitch(this.samples);

      if (result !== 0) {
        this.port.postMessage({ type: 'pitch', pitch: result });
      }
    }

    // return true to let the audio system know to continue processing samples
    // through this node.
    return true
  }
}

registerProcessor("PitchProcessor", PitchProcessor)
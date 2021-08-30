// eslint-disable-next-line import/no-webpack-loader-syntax
import PitchProcessorUrl from 'worklet-loader!./PitchProcessor.worklet.ts';
import PitchNode from './PitchNode'

async function getWebAudioMediaStream() {
  if (!window.navigator.mediaDevices) {
    throw new Error(
      "This browser doesn't support the Web Audio API, or the Web Audio API is disabled."
    )
  }

  try {
    const result = await window.navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    })

    return result;
  } catch (e) {
    switch (e.name) {
      case "NotAllowedError":
        throw new Error(
          "A recording device was found but the application couldn't access it. Enable the device in your browser settings."
        );
      case "NotFoundError":
        throw new Error(
          "No recording device found. Plug in a microphone and click retry."
        )
      default:
        throw e
    }
  }
}

export async function setupAudio(onPitchDetectedCallback: (pitch: number) => void) {
  // get browser audio
  const mediaStream = await getWebAudioMediaStream();
  const context = new window.AudioContext();
  await context.resume()
  const audioSource = context.createMediaStreamSource(mediaStream);

  let node;

  try {
    // Fetch WASM code
    const response = await window.fetch("wasm-tuner/wasm_tuner_bg.wasm");
    const wasmBytes = await response.arrayBuffer();

    // Add our worklet to the context
    try {
      await context.audioWorklet.addModule(PitchProcessorUrl);
    } catch (e) {
      throw new Error(
        `Failed to load audio analyzer worklet at url: ${PitchProcessorUrl}. Details: ${e.message}`
      )
    }
    console.log('loaded module into worklet')
    // create the worklet node
    console.log(context, PitchNode)
    node = new PitchNode(context, "PitchProcessor")
    console.log('loaded module into audio context')
    const numAudioSamplesPerAnalysis = 1024

    node.init(wasmBytes, onPitchDetectedCallback, numAudioSamplesPerAnalysis);
    console.log('called init')
    audioSource.connect(node)
    console.log('connected source to node')
    node.connect(context.destination)
    console.log('connected node to destination')
  } catch (err) {
    throw new Error(
      `Failed to load audio analyzer WASM module. Further info: ${err.message}`
    );
  }

  return { context, node };
}
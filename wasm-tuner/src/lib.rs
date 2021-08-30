use pitch_detection::{McLeodDetector, PitchDetector};
use wasm_bindgen::prelude::*;
mod utils;

#[wasm_bindgen]                           // Rust macro, implements binding between JS and Rust
pub struct WasmPitchDetector {            // struct defines object data (singleton, not class)
  sample_rate: usize,                     
  fft_size: usize,
  detector: McLeodDetector<f32>,
}

#[wasm_bindgen]
impl WasmPitchDetector {                  // implements object functions
  pub fn new(sample_rate: usize, fft_size: usize) -> WasmPitchDetector {    // constructor
    utils::set_panic_hook();      // forwards panic messages to js console

    let fft_pad = fft_size / 2;   // padding signal smooths results

    WasmPitchDetector {           // return constructed object
      sample_rate,
      fft_size,
      detector: McLeodDetector::<f32>::new(fft_size, fft_pad),
    }
  }

  // detect_pitch: member function definition
  //  arguments:
  //      &mut self: same WasmPitchDetector context, passed automatically
  //      audio_samples: arbitrary-sized array of float32 numbers
  //  output:
  //      f32: output single float32

  pub fn detect_pitch(&mut self, audio_samples: Vec<f32>) -> f32 {          
    if audio_samples.len() < self.fft_size  {   // panic macro reports error and terminates
      panic!("Insufficient samples passed to detect_pitch(). Expected an array containing {} elements but got {}", self.fft_size, audio_samples.len());
    }

    // Use power threshold, a metric used to evaluate
    // signal strength (amplitude), to filter out incidental
    // sounds, like soft hiss. Library's default is 5.0.
    const POWER_THRESHOLD: f32 = 5.0;

    // Use clarity to filter out sounds with many frequencies,
    // like background noise. An instrument being tuned will
    // produce a strong, consistent signal with one primary
    // frequency.
    const CLARITY_THRESHOLD: f32 = 0.6;

    // call our instance of the mcleod detector and get the current pitch
    let optional_pitch = self.detector.get_pitch(
      &audio_samples,
      self.sample_rate,
      POWER_THRESHOLD,
      CLARITY_THRESHOLD
    );

    // the final statement is returned.
    // match is like a more-flexible js switch statement
    // and lets us handle conditions appropriately.
    match optional_pitch {  
      Some(pitch) => pitch.frequency,
      None => 0.0
    }
  }
}

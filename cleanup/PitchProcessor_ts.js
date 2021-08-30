var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
debugger;
import init, { WasmPitchDetector } from "/wasm-tuner/wasm_tuner";
import "./TextEncoder.js";


var PitchProcessor = /** @class */ (function (_super) {
    __extends(PitchProcessor, _super);
    function PitchProcessor() {
        var _this = _super.call(this) || this;
        _this.numAudioSamplesPerAnalysis = 0;
        _this.onmessage = function (event) {
            if (event.type === 'send-wasm-module') {
                // the audioworkletnode sends a message containing the wasm library
                // and information about the audio device tree.
                init(WebAssembly.compile(event.wasmBytes)).then(function () {
                    _this.port.postMessage({ type: 'wasm-module-loaded' });
                });
            }
            else if (event.type === 'init-detector') {
                var sampleRate = event.sampleRate, sampleCount = event.numAudioSamplesPerAnalysis;
                // note number of audio samples per event (webaudio = 128 i think)
                _this.numAudioSamplesPerAnalysis = sampleCount;
                _this.detector = WasmPitchDetector.new(sampleRate, sampleCount);
                // create input buffer
                _this.samples = new Float32Array(sampleCount).fill(0);
            }
        };
        // Initialize buffer of samples for later analysis
        _this.samples = new Float32Array();
        // Initialize starting number of samples
        _this.totalSamples = 0;
        _this.port.onmessage = function (event) { return _this.onmessage(event.data); };
        _this.detector = null;
        return _this;
    }
    PitchProcessor.prototype.process = function (inputs, outputs, parameters) {
        // inputs = new audio samples. if stereo, two arrays
        // outputs = in this case, same audio samples as inputs
        var inputChannels = inputs[0];
        var inputSamples = inputChannels[0];
        // WebAudioApi calls process every 128 samples, so assume
        // size of inputSamples is >= 128 and a power of two.
        // if we have not yet filled the sample buffer, we'll simply
        // copy each new sample into it.
        if (this.totalSamples < this.numAudioSamplesPerAnalysis) {
            for (var _i = 0, inputSamples_1 = inputSamples; _i < inputSamples_1.length; _i++) {
                var sampleValue = inputSamples_1[_i];
                this.samples[this.totalSamples++] = sampleValue;
            }
        }
        else {
            // If the buffer is full, cycle out old samples and cycle in new ones:
            var numNewSamples = inputSamples.length; // # we're adding
            var numExistingSamples = this.samples.length - numNewSamples; // # we're keeping
            // copy latest old samples in excess of new sample count
            // to start of this.samples.
            for (var i = 0; i < numExistingSamples; i++) {
                this.samples[i] = this.samples[i + numNewSamples];
            }
            // add new samples onto end of buffer
            for (var i = 0; i < numNewSamples; i++) {
                this.samples[numExistingSamples + i] = inputSamples[i];
            }
            // add to total sample count, although it's just trivia once
            // the buffer has filled for the first time.
            this.totalSamples += inputSamples.length;
        }
        // if we have enough samples and the pitch detector is ready, call it.
        if (this.totalSamples >= this.numAudioSamplesPerAnalysis && this.detector) {
            var result = this.detector.detect_pitch(this.samples);
            if (result !== 0) {
                this.port.postMessage({ type: 'pitch', pitch: result });
            }
        }
        // return true to let the audio system know to continue processing samples
        // through this node.
        return true;
    };
    return PitchProcessor;
}(AudioWorkletProcessor));
registerProcessor("PitchProcessor", PitchProcessor);
//# sourceMappingURL=PitchProcessor.js.map
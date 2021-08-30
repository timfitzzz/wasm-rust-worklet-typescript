import React from 'react';
import './App.css';
import { setupAudio } from './setupAudio';
import PitchNode from './PitchNode';
import Markdown from 'react-markdown';
// eslint-disable-next-line import/no-webpack-loader-syntax
import README from '!raw-loader!./README.md';

function PitchReadout({running, latestPitch}: { running: boolean, latestPitch?: number }) {
  return (
    <div className={"Pitch-readout"}>
      {latestPitch
        ? `Latest pitch: ${latestPitch.toFixed(1)} Hz`
        : running
        ? "Listening..."
        : "Paused"
      }
    </div>
  )
}

function AudioRecorderControl() {
  const [audio, setAudio] = React.useState<{ context:  AudioContext, node: PitchNode } | undefined>(undefined)
  const [running, setRunning] = React.useState<boolean>(false)
  const [latestPitch, setLatestPitch] = React.useState<number | undefined>(undefined)

  if (!audio) {
    return (
      <button
        onClick={async () => {
          setAudio(await setupAudio(setLatestPitch));
          setRunning(true);
        }}
      >
        Start
      </button>
    )
  }

  // otherwise, audio already initialized
  const { context } = audio;
  return (
    <div>
      <PitchReadout running={running} latestPitch={latestPitch} />
      <button
        onClick={async () => {
          if (running) {
            await context.suspend();
            setRunning(context.state === 'running')
          } else {
            await context.resume();
            setRunning(context.state === 'running')
          }
        }}
        disabled={context.state !== 'running' && context.state !== 'suspended'}
      >
        {running ? "Pause" : "Resume"}
      </button>
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <div className='appInner'>
        <div className='markdownPane'>
          <div className='markdownContainer'>
            <Markdown>{README}</Markdown>
          </div>
        </div>
        <div className='tunerContainer'>
          <header className="tunerHeader">
                Tuner
          </header>
          <div className="tunerContent">
            <AudioRecorderControl />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

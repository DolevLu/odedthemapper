/**
 * Generates a soft, calm ambient pad entirely in the browser via the Web
 * Audio API — no external audio file. Used to give the in-browser album
 * collage video a pleasant background track without needing a licensed
 * music asset. Cycles through a gentle 4-chord progression, each chord a
 * pair of slightly-detuned sine oscillators per note (for warmth) with a
 * slow attack/release envelope, run through a soft low-pass filter.
 */
export function startAmbientMusic(durationSec: number): { audioContext: AudioContext; destinationStream: MediaStream; stop: () => void } {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const destination = audioContext.createMediaStreamDestination();

  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.14;
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  masterGain.connect(filter);
  filter.connect(destination);
  filter.connect(audioContext.destination); // also audible while previewing/rendering

  // Calm I–vi–IV–V-style progression (Hz), each chord held ~5s with overlap.
  const chords: number[][] = [
    [261.63, 329.63, 392.0], // C major
    [220.0, 261.63, 329.63], // A minor
    [174.61, 220.0, 261.63], // F major
    [196.0, 246.94, 293.66], // G major
  ];
  const chordDuration = 5;
  const activeNodes: (OscillatorNode | GainNode)[] = [];

  let chordStart = 0;
  let chordIndex = 0;
  while (chordStart < durationSec) {
    const chord = chords[chordIndex % chords.length];
    const startTime = audioContext.currentTime + chordStart;
    const endTime = audioContext.currentTime + Math.min(chordStart + chordDuration + 1.2, durationSec + 1.2);

    for (const freq of chord) {
      for (const detune of [-3, 3]) {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(1 / chord.length / 2, startTime + 1.5);
        gain.gain.setValueAtTime(1 / chord.length / 2, Math.max(startTime + 1.5, endTime - 1.5));
        gain.gain.linearRampToValueAtTime(0, endTime);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(endTime + 0.1);
        activeNodes.push(osc, gain);
      }
    }

    chordStart += chordDuration;
    chordIndex++;
  }

  function stop() {
    activeNodes.forEach((n) => {
      if (n instanceof OscillatorNode) {
        try {
          n.stop();
        } catch {
          // already stopped
        }
      }
    });
    audioContext.close().catch(() => {});
  }

  return { audioContext, destinationStream: destination.stream, stop };
}

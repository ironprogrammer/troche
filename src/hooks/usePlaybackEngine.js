import { useCallback, useEffect, useRef, useState } from "react";
import { partSig } from "../utils.js";

// Timing model: one beat = one count = a constant duration set by BPM,
// regardless of the time-sig denominator. A part just has `top` counts per
// measure. So a 6/8 bar is 6 counts long and a 4/4 bar is 4 counts long, all
// at the same pulse. The denominator is effectively a label.
export function usePlaybackEngine(activeSong) {
  const [playing, setPlaying] = useState(false);
  const [elapsedBeats, setElapsedBeats] = useState(0);
  const [metronome, setMetronome] = useState(true);

  const rafRef = useRef(null);
  const startRef = useRef(0);        // audioCtx time corresponding to timeline beat 0
  const audioCtxRef = useRef(null);
  const schedulerRef = useRef(null); // setInterval id for the lookahead scheduler
  const nextBeatRef = useRef(0);     // index of the next beat to schedule (negative during count-in)
  const metronomeRef = useRef(metronome);
  useEffect(() => { metronomeRef.current = metronome; }, [metronome]);

  const secPerBeat = activeSong ? 60 / activeSong.bpm : 0.5;
  const masterTop = activeSong?.timeSigTop || 4;
  const masterBottom = activeSong?.timeSigBottom || 4;

  // precompute each part's span in beats + its sig, and the song total
  const segments = [];
  let totalBeats = 0;
  if (activeSong) {
    for (const p of activeSong.parts) {
      const { top, bottom } = partSig(p, activeSong);
      const span = p.measures * top; // counts
      segments.push({ id: p.id, top, bottom, startB: totalBeats, spanB: span });
      totalBeats += span;
    }
  }

  // count-in: N master-measures of counts before the song. timeline starts negative.
  const countInActive = !!activeSong?.countIn;
  const countInBeats = countInActive
    ? (activeSong.countInBars || 1) * masterTop
    : 0;
  const inCountIn = playing && elapsedBeats < 0;

  // Is a given timeline beat index a downbeat (beat 1 of its measure)?
  // Negative indices are count-in beats, metered by the master sig.
  const isDownbeat = useCallback((beatIdx) => {
    if (beatIdx < 0) {
      const into = beatIdx + countInBeats; // 0..countInBeats-1
      return into % masterTop === 0;
    }
    for (const seg of segments) {
      if (beatIdx >= seg.startB && beatIdx < seg.startB + seg.spanB) {
        return (beatIdx - seg.startB) % seg.top === 0;
      }
    }
    return false;
  }, [segments, countInBeats, masterTop]);

  // body click during the song proper — oscillator-based, accent on downbeats.
  const playClick = (when, accent) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1500 : 900;
    const peak = accent ? 0.5 : 0.32;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.06);
  };

  // count-in: short noise burst through a high bandpass — "stick click".
  // Uniform across all count-in beats (no accent).
  const stickBuffersRef = useRef(null);
  const getStickBuffer = (ctx) => {
    if (stickBuffersRef.current && stickBuffersRef.current.sampleRate === ctx.sampleRate) {
      return stickBuffersRef.current.buffer;
    }
    const len = Math.floor(ctx.sampleRate * 0.03); // 30ms
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 55);
    }
    stickBuffersRef.current = { sampleRate: ctx.sampleRate, buffer };
    return buffer;
  };
  const playStick = (when) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = getStickBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 2.2;
    const gain = ctx.createGain();
    gain.gain.value = 0.55;
    src.connect(bp).connect(gain).connect(ctx.destination);
    src.start(when);
  };

  const stopScheduler = () => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    setPlaying(false);
    setElapsedBeats(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopScheduler();
  }, []);

  // lookahead scheduler: queues clicks ~100ms ahead against the audio clock
  const runScheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const lookahead = 0.1; // seconds
    while (true) {
      const idx = nextBeatRef.current;
      const beatTime = startRef.current + (idx + countInBeats) * secPerBeat;
      if (beatTime > ctx.currentTime + lookahead) break;
      if (idx >= totalBeats) break;
      if (beatTime >= ctx.currentTime && metronomeRef.current) {
        if (idx < 0) playStick(beatTime);
        else playClick(beatTime, isDownbeat(idx));
      }
      nextBeatRef.current = idx + 1;
    }
  }, [secPerBeat, countInBeats, totalBeats, isDownbeat]);

  const tick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Audio output is delayed by `outputLatency` relative to ctx.currentTime
    // (often 5–50ms desktop, more on bluetooth/mobile). The visual reads
    // ctx.currentTime directly, so without compensation the display races
    // ahead of the audible click. Subtract the latency so the playhead
    // shows the position of the click currently reaching the speakers.
    const latency = ctx.outputLatency || ctx.baseLatency || 0;
    const b = (ctx.currentTime - latency - startRef.current) / secPerBeat - countInBeats;
    if (b >= totalBeats) {
      setElapsedBeats(totalBeats);
      setPlaying(false);
      stopScheduler();
      return;
    }
    setElapsedBeats(b);
    rafRef.current = requestAnimationFrame(tick);
  }, [secPerBeat, totalBeats, countInBeats]);

  const togglePlay = () => {
    if (playing) {
      stop();
      return;
    }
    if (totalBeats <= 0) return;
    // create/resume the audio context within the user gesture (autoplay policy)
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    // if at/past the end, restart from the top; otherwise resume in place
    const atEnd = elapsedBeats >= totalBeats;
    const begin = !atEnd && elapsedBeats > 0 ? elapsedBeats : -countInBeats;
    startRef.current = ctx.currentTime - (begin + countInBeats) * secPerBeat;
    nextBeatRef.current = Math.ceil(begin - 1e-9);
    setElapsedBeats(begin);
    setPlaying(true);
    runScheduler();
    schedulerRef.current = setInterval(runScheduler, 25);
  };

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [playing, tick]);

  // clean up audio on unmount
  useEffect(() => () => {
    stopScheduler();
    if (audioCtxRef.current) audioCtxRef.current.close();
  }, []);

  // ---- derived display state ----
  let ciBeat = 0;
  if (inCountIn) {
    const into = elapsedBeats + countInBeats;
    ciBeat = (Math.floor(into) % masterTop) + 1;
  }

  const songBeats = Math.max(0, elapsedBeats);
  let activePartId = null;
  const partProgress = {};
  for (const seg of segments) {
    const end = seg.startB + seg.spanB;
    if (playing && !inCountIn && songBeats >= seg.startB && songBeats < end) {
      activePartId = seg.id;
      partProgress[seg.id] = (songBeats - seg.startB) / seg.spanB;
    } else if (playing && songBeats >= end) {
      partProgress[seg.id] = 1;
    } else {
      partProgress[seg.id] = 0;
    }
  }

  let curMeasure = 0, curBeat = 0;
  if (activePartId) {
    const seg = segments.find((s) => s.id === activePartId);
    if (seg) {
      const into = songBeats - seg.startB;
      curMeasure = Math.floor(into / seg.top) + 1;
      curBeat = Math.floor(into % seg.top) + 1;
    }
  }

  return {
    playing,
    elapsedBeats,
    metronome,
    setMetronome,
    togglePlay,
    stop,
    // derived song shape
    segments,
    totalBeats,
    secPerBeat,
    countInActive,
    countInBeats,
    masterTop,
    masterBottom,
    // derived display
    inCountIn,
    activePartId,
    partProgress,
    ciBeat,
    curMeasure,
    curBeat,
  };
}

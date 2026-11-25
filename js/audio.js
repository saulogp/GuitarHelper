'use strict';

/*
  Som da guitarra pela Web Audio API.

  A corda é sintetizada por modelo físico (Karplus-Strong estendido): um ruído curto,
  filtrado como a palheta, circula numa linha de atraso do tamanho de um período da
  nota e perde energia a cada volta, como uma corda que vibra e se acalma. O atraso
  fracionário (filtro passa-tudo) acerta a frequência com precisão de centésimos de
  semitom, e o ponto da palhetada tira os harmônicos que uma corda real não teria.

  Depois da corda vem o timbre (corpo, amplificador, efeitos). Cada timbre é um item
  de INSTRUMENTS: para criar outro, basta descrever a corda (pluck) e a cadeia de
  efeitos (chain). Como numa guitarra, cada corda toca uma nota por vez: uma nota
  nova na mesma corda abafa a anterior.
*/
const GuitarAudio = (() => {
  const RENDER_SECONDS = 5; // duração máxima de uma nota; a nota pode ser cortada antes
  const RELEASE = 0.06; // constante de tempo do abafamento ao soltar a nota

  /* Corda (função pura, também usada nos testes) */

  // Gerador pseudoaleatório com semente: a mesma nota sai sempre com o mesmo ataque.
  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // pluck: sustain (segundos até cair 60 dB), brightness (0–1, palhetada mais ou menos
  // brilhante) e pickPosition (0–0,5, onde a palheta toca a corda: perto da ponte = 0,1).
  function renderString(frequency, sampleRate, pluck, seconds = RENDER_SECONDS, seed = 1) {
    const length = Math.round(sampleRate * seconds);
    const out = new Float32Array(length);
    const random = seededRandom(seed);

    // Atraso total do laço = N (linha) + 0,5 (média de duas amostras) + d (passa-tudo).
    const loop = sampleRate / frequency - 0.5;
    const size = Math.max(2, Math.floor(loop - 0.1));
    const fraction = loop - size;
    const allpass = (1 - fraction) / (1 + fraction);
    // Perda por volta para cair 60 dB em `sustain` segundos na fundamental.
    const loss = 0.001 ** (1 / (pluck.sustain * frequency));

    // Excitação: um período de ruído, suavizado pela palheta e com o pente do ponto de
    // palhetada (a corda não vibra nos harmônicos que têm nó naquele ponto).
    const raw = new Float32Array(size);
    let smooth = 0;
    for (let i = 0; i < size; i++) {
      smooth += pluck.brightness * (random() * 2 - 1 - smooth);
      raw[i] = smooth;
    }
    const pick = Math.max(1, Math.round(pluck.pickPosition * size));
    const excitation = new Float32Array(size);
    let mean = 0;
    for (let i = 0; i < size; i++) {
      excitation[i] = raw[i] - (i >= pick ? raw[i - pick] : 0);
      mean += excitation[i] / size;
    }

    const line = new Float32Array(size);
    let index = 0;
    let previous = 0;
    let allpassIn = 0;
    let allpassOut = 0;
    let dcIn = 0;
    let dcOut = 0;
    let peak = 0;

    for (let n = 0; n < length; n++) {
      const delayed = line[index];
      const averaged = 0.5 * (delayed + previous);
      previous = delayed;
      const tuned = allpass * averaged + allpassIn - allpass * allpassOut;
      allpassIn = averaged;
      allpassOut = tuned;
      const sample = loss * tuned + (n < size ? excitation[n] - mean : 0);
      line[index] = sample;
      index = index + 1 === size ? 0 : index + 1;

      // Bloqueio de corrente contínua, para a forma de onda ficar centrada no zero.
      dcOut = sample - dcIn + 0.995 * dcOut;
      dcIn = sample;
      out[n] = dcOut;
      if (Math.abs(dcOut) > peak) peak = Math.abs(dcOut);
    }

    // Normaliza e suaviza o fim, para a nota mais longa não terminar num estalo.
    const gain = peak > 0 ? pluck.level / peak : 0;
    const fade = Math.min(length, Math.round(sampleRate * 0.08));
    for (let n = 0; n < length; n++) {
      const tail = n >= length - fade ? (length - 1 - n) / fade : 1;
      out[n] *= gain * tail;
    }
    return out;
  }

  /* Timbres */

  function filter(context, type, frequency, { gain = 0, Q = 0.7 } = {}) {
    const node = context.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.gain.value = gain;
    node.Q.value = Q;
    return node;
  }

  function series(...nodes) {
    nodes.reduce((from, to) => from.connect(to));
    return { input: nodes[0], output: nodes[nodes.length - 1] };
  }

  // Curva de saturação suave, como a de um amplificador valvulado forçado.
  function driveCurve(amount) {
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(amount * x) / Math.tanh(amount);
    }
    return curve;
  }

  const INSTRUMENTS = [
    {
      id: 'clean',
      label: 'Guitarra limpa',
      pluck: { sustain: 4.2, brightness: 0.5, pickPosition: 0.13, level: 0.8 },
      chain: (context) => series(
        filter(context, 'highpass', 70),
        filter(context, 'peaking', 220, { gain: 2, Q: 0.9 }),
        filter(context, 'peaking', 2600, { gain: 2.5, Q: 1 }),
        filter(context, 'lowpass', 6500),
      ),
    },
    {
      id: 'acoustic',
      label: 'Violão de aço',
      pluck: { sustain: 2.8, brightness: 0.78, pickPosition: 0.18, level: 0.8 },
      chain: (context) => series(
        filter(context, 'highpass', 75),
        // Ressonâncias do tampo e da caixa.
        filter(context, 'peaking', 105, { gain: 5, Q: 1.6 }),
        filter(context, 'peaking', 230, { gain: 3, Q: 1.4 }),
        filter(context, 'peaking', 3200, { gain: 3, Q: 0.9 }),
        filter(context, 'highshelf', 7000, { gain: 2 }),
      ),
    },
    {
      id: 'distorted',
      label: 'Guitarra com distorção',
      pluck: { sustain: 6, brightness: 0.55, pickPosition: 0.1, level: 0.8 },
      chain: (context) => {
        const drive = context.createGain();
        drive.gain.value = 9;
        const shaper = context.createWaveShaper();
        shaper.curve = driveCurve(3.5);
        shaper.oversample = '4x';
        const level = context.createGain();
        level.gain.value = 0.32;
        // Antes da saturação, corta graves embolados; depois, o filtro faz a caixa do amplificador.
        return series(
          filter(context, 'highpass', 110),
          drive,
          shaper,
          filter(context, 'peaking', 900, { gain: 3, Q: 0.8 }),
          filter(context, 'lowpass', 4800, { Q: 0.9 }),
          filter(context, 'highpass', 80),
          level,
        );
      },
    },
    {
      id: 'echo',
      label: 'Limpa com eco',
      pluck: { sustain: 4.2, brightness: 0.5, pickPosition: 0.13, level: 0.8 },
      chain: (context) => {
        const tone = series(
          filter(context, 'highpass', 70),
          filter(context, 'peaking', 2600, { gain: 2.5, Q: 1 }),
          filter(context, 'lowpass', 6500),
        );
        const output = context.createGain();
        const delay = context.createDelay(1);
        delay.delayTime.value = 0.33;
        const feedback = context.createGain();
        feedback.gain.value = 0.35;
        const wet = context.createGain();
        wet.gain.value = 0.4;
        const darken = filter(context, 'lowpass', 3200);
        tone.output.connect(output);
        tone.output.connect(delay);
        delay.connect(darken).connect(feedback).connect(delay);
        darken.connect(wet).connect(output);
        return { input: tone.input, output };
      },
    },
  ];

  /* Motor */

  const settings = {
    instrument: 'clean',
    volume: 0.8,
    duration: 1.5, // segundos de cada nota tocada no braço
  };

  let context = null;
  let master = null;
  const chains = new Map();
  const buffers = new Map();
  const voices = new Set();
  const stringVoices = new Map(); // corda → voz que está soando nela
  const listeners = new Set();

  // Um único AudioContext para o app inteiro (o metrônomo também usa este).
  function getContext() {
    if (!context) {
      context = new AudioContext({ latencyHint: 'interactive' });
      master = context.createGain();
      master.gain.value = settings.volume;
      // Limitador: um acorde de seis cordas não distorce na saída.
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      master.connect(limiter).connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function instrument(id = settings.instrument) {
    return INSTRUMENTS.find((item) => item.id === id) ?? INSTRUMENTS[0];
  }

  function chainFor(id) {
    if (!chains.has(id)) {
      const chain = instrument(id).chain(context);
      chain.output.connect(master);
      chains.set(id, chain);
    }
    return chains.get(id);
  }

  function bufferFor(id, midi) {
    const key = `${id}-${midi}`;
    if (!buffers.has(key)) {
      const data = renderString(Tunings.midiFrequency(midi), context.sampleRate, instrument(id).pluck, RENDER_SECONDS, midi * 7919);
      const buffer = context.createBuffer(1, data.length, context.sampleRate);
      buffer.copyToChannel(data, 0);
      buffers.set(key, buffer);
    }
    return buffers.get(key);
  }

  function notify() {
    for (const listener of listeners) listener(voices.size);
  }

  function finish(voice) {
    if (voice.finished) return;
    voice.finished = true;
    clearTimeout(voice.startTimer);
    clearTimeout(voice.endTimer);
    voices.delete(voice);
    if (stringVoices.get(voice.string) === voice) stringVoices.delete(voice.string);
    if (voice.started) voice.onEnd?.();
    notify();
  }

  // Abafa a voz no instante `at` (tempo do AudioContext).
  function cut(voice, at) {
    if (voice.finished) return;
    const time = Math.max(at, context.currentTime);
    voice.gain.gain.cancelScheduledValues(time);
    voice.gain.gain.setTargetAtTime(0, time, RELEASE / 3);
    try {
      voice.source.stop(time + 0.3);
    } catch {
      // A fonte já tinha um fim agendado antes deste.
    }
    clearTimeout(voice.endTimer);
    voice.endTimer = setTimeout(() => finish(voice), Math.max(0, (time - context.currentTime) * 1000));
  }

  /*
    Toca uma nota. midi: altura; string: corda (para abafar a nota anterior nela);
    when: tempo do AudioContext (padrão: agora); duration: segundos até soltar a nota;
    velocity: força da palhetada (0–1). onStart/onEnd: avisos para o destaque visual.
  */
  function play({ midi, string = null, when = 0, duration = settings.duration, velocity = 0.85, onStart, onEnd }) {
    const audio = getContext();
    const start = Math.max(when, audio.currentTime + 0.01);
    const end = start + duration;
    const id = settings.instrument;

    const source = audio.createBufferSource();
    source.buffer = bufferFor(id, midi);
    // Palhetada mais leve soa mais escura e mais baixa.
    const tone = filter(audio, 'lowpass', 1800 + velocity * velocity * 9000);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(velocity, start);
    gain.gain.setTargetAtTime(0, end, RELEASE);
    source.connect(tone).connect(gain).connect(chainFor(id).input);
    source.start(start);
    source.stop(Math.min(end + 0.5, start + RENDER_SECONDS));

    const voice = { source, gain, string, start, end, onStart, onEnd, started: false, finished: false };
    voices.add(voice);

    if (string !== null) {
      const previous = stringVoices.get(string);
      if (previous && !previous.finished) cut(previous, start);
      stringVoices.set(string, voice);
    }

    voice.startTimer = setTimeout(() => {
      if (voice.finished) return;
      voice.started = true;
      voice.onStart?.();
    }, Math.max(0, (start - audio.currentTime) * 1000));
    voice.endTimer = setTimeout(() => finish(voice), Math.max(0, (end - audio.currentTime) * 1000));
    source.onended = () => finish(voice);
    notify();
    return voice;
  }

  function release(list) {
    if (!context) return;
    for (const voice of list) cut(voice, context.currentTime);
  }

  function stopAll() {
    release([...voices]);
  }

  function setVolume(value) {
    settings.volume = value;
    if (master) master.gain.setTargetAtTime(value, context.currentTime, 0.02);
  }

  function setInstrument(id) {
    settings.instrument = instrument(id).id;
  }

  function setDuration(seconds) {
    settings.duration = Math.min(RENDER_SECONDS - 0.5, Math.max(0.2, seconds));
  }

  return {
    INSTRUMENTS,
    settings,
    renderString,
    context: getContext,
    play,
    release,
    stopAll,
    setVolume,
    setInstrument,
    setDuration,
    isActive: () => voices.size > 0,
    subscribe: (listener) => listeners.add(listener),
  };
})();

/*
  Reprodutor de sequências: toca passos no tempo (BPM), com tocar, pausar, parar e
  repetir. Cada passo tem notas e quantos tempos dura. O agendamento olha um pouco à
  frente, como o metrônomo, para o som não atrasar; o aviso de cada passo (onStep)
  chega no instante em que ele soa, para o destaque visual acompanhar o som.
*/
const SequencePlayer = (() => {
  const LOOKAHEAD_MS = 25;
  const AHEAD_SECONDS = 0.12;

  function create({ onStep = () => {}, onState = () => {} } = {}) {
    let steps = [];
    let index = 0;
    let nextTime = 0;
    let timer = null;
    let endTimer = null;
    let status = 'stopped'; // 'playing', 'paused' ou 'stopped'
    let voices = [];
    let lastStarted = -1; // último passo que já soou
    const stepTimers = new Set();
    const options = { bpm: 100, repeat: false };

    const beat = () => 60 / options.bpm;

    function setStatus(value) {
      status = value;
      onState(status);
    }

    function clearTimers() {
      clearInterval(timer);
      timer = null;
      clearTimeout(endTimer);
      endTimer = null;
      for (const id of stepTimers) clearTimeout(id);
      stepTimers.clear();
    }

    function schedule() {
      const context = GuitarAudio.context();
      while (nextTime < context.currentTime + AHEAD_SECONDS) {
        if (index >= steps.length) {
          if (options.repeat && steps.length) {
            index = 0;
          } else {
            clearInterval(timer);
            timer = null;
            // Termina quando o último passo acaba de soar.
            endTimer = setTimeout(() => {
              setStatus('stopped');
              index = 0;
              onStep(-1);
            }, Math.max(0, (nextTime - context.currentTime) * 1000));
            return;
          }
        }

        const step = steps[index];
        const stepIndex = index;
        const when = nextTime;
        voices = voices.filter((voice) => !voice.finished);
        for (const note of step.notes) {
          voices.push(GuitarAudio.play({
            midi: note.midi,
            string: note.string,
            when: when + (note.offset ?? 0),
            duration: note.seconds ?? (note.beats ?? step.beats) * beat(),
            velocity: note.velocity ?? 0.85,
            onStart: note.onStart,
            onEnd: note.onEnd,
          }));
        }
        const id = setTimeout(() => {
          stepTimers.delete(id);
          lastStarted = stepIndex;
          if (status === 'playing') onStep(stepIndex);
        }, Math.max(0, (when - context.currentTime) * 1000));
        stepTimers.add(id);

        nextTime += step.beats * beat();
        index++;
      }
    }

    function start() {
      const context = GuitarAudio.context();
      nextTime = context.currentTime + 0.06;
      setStatus('playing');
      timer = setInterval(schedule, LOOKAHEAD_MS);
      schedule();
    }

    return {
      options,
      get status() {
        return status;
      },
      play(newSteps, newOptions = {}) {
        this.stop();
        Object.assign(options, newOptions);
        steps = newSteps;
        index = 0;
        lastStarted = -1;
        if (steps.length) start();
      },
      pause() {
        if (status !== 'playing') return;
        clearTimers();
        GuitarAudio.release(voices);
        voices = [];
        // Retoma do primeiro passo que ainda não tinha soado.
        index = lastStarted + 1;
        if (index >= steps.length && options.repeat) index = 0;
        setStatus('paused');
      },
      resume() {
        if (status !== 'paused') return;
        start();
      },
      stop() {
        const wasActive = status !== 'stopped';
        clearTimers();
        GuitarAudio.release(voices);
        voices = [];
        index = 0;
        lastStarted = -1;
        if (wasActive) {
          setStatus('stopped');
          onStep(-1);
        }
      },
    };
  }

  return { create };
})();

if (typeof module === 'object' && module.exports) module.exports = { GuitarAudio, SequencePlayer };

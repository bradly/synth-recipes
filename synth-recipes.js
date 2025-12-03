const playButton = document.querySelector('button#play');
const soundName = document.querySelector('#sound-name');

function loadSoundFromHash() {
  const id = location.hash.slice(1);
  if (!id) return;

  const selectedClass = 'selected';
  const hrefSelector = `[href="#${id}"]`;
  document.querySelectorAll(`#recipes a:not(${hrefSelector})`).forEach(a => a.classList.remove(selectedClass));
  document.querySelector(`#recipes a${hrefSelector}`).classList.add(selectedClass);

  fetch(`recipes/${id}.json`)
    .then(r => r.json())
    .then(populateUI);

  document.getElementById('info').classList.remove('hidden');
}

function setInputValue(name, value) {
  const inputs = document.querySelectorAll(`[name="${name}"]`);

  if (inputs.length === 1) {
    inputs[0].value = value;
  } else {
    inputs.forEach(input => {
      input.checked = input.value === value;
    });
  }
}

function getInputValue(name) {
  const inputs = document.querySelectorAll(`[name="${name}"]`);

  if (inputs.length === 1) {
    return inputs[0].value;
  }

  for (const input of inputs) {
    if (input.checked) return input.value;
  }

  return null;
}

function populateUI(sound) {
  soundName.textContent = sound.name;
  setInputValue("note", sound.note);
  setInputValue("duration", sound.duration);

  setInputValue("waveform_type", sound.waveform.type);
  setInputValue("waveform_count", sound.waveform.count);
  setInputValue("waveform_detune", sound.waveform.detune);

  setInputValue("filter_type", sound.filter.type);
  setInputValue("filter_frequency", sound.filter.frequency);
  setInputValue("filter_resonance", sound.filter.resonance);
  
  setInputValue("amp_attack", sound.ampEnvelope.attack);
  setInputValue("amp_decay", sound.ampEnvelope.decay);
  setInputValue("amp_sustain", sound.ampEnvelope.sustain);
  setInputValue("amp_release", sound.ampEnvelope.release);
  
  setInputValue("envelope_amount", sound.filterEnvelope.amount);
  setInputValue("envelope_attack", sound.filterEnvelope.attack);
  setInputValue("envelope_decay", sound.filterEnvelope.decay);
  setInputValue("envelope_sustain", sound.filterEnvelope.sustain);
  setInputValue("envelope_release", sound.filterEnvelope.release);
  
  setInputValue("noise_type", sound.noise.type);
  setInputValue("noise_mix", sound.noise.mix);
  
  setInputValue("pitch_amount", sound.pitch.amount);
  setInputValue("pitch_attack", sound.pitch.attack);
  setInputValue("pitch_decay", sound.pitch.decay);
  setInputValue("pitch_sustain", sound.pitch.sustain);
  setInputValue("pitch_release", sound.pitch.release);
  
  setInputValue("fm_ratio", sound.fm.ratio);
  setInputValue("fm_index", sound.fm.index);
  setInputValue("fm_attack", sound.fm.attack);
  setInputValue("fm_decay", sound.fm.decay);
  setInputValue("fm_sustain", sound.fm.sustain);
  setInputValue("fm_release", sound.fm.release);
}

window.addEventListener('hashchange', loadSoundFromHash);
window.addEventListener('DOMContentLoaded', loadSoundFromHash);

playButton.addEventListener('click', async () => {
  await Tone.start();

  const note = getInputValue('note');
  const waveform_count = parseInt(getInputValue('waveform_count'));
  const waveform_type = getInputValue('waveform_type');
  const oscillator_type = waveform_count > 1 ? 'fat' + waveform_type : waveform_type;
  const noise_mix = parseFloat(getInputValue('noise_mix'));
  const fm_index = parseFloat(getInputValue('fm_index'));

  let synth;

  if (fm_index > 0) {
    synth = new Tone.FMSynth({
      harmonicity: parseFloat(getInputValue('fm_ratio')),
      modulationIndex: fm_index,
      oscillator: {
        type: waveform_type
      },
      envelope: {
        attack: parseFloat(getInputValue('amp_attack')),
        decay: parseFloat(getInputValue('amp_decay')),
        sustain: parseFloat(getInputValue('amp_sustain')),
        release: parseFloat(getInputValue('amp_release'))
      },
      modulationEnvelope: {
        attack: parseFloat(getInputValue('fm_attack')),
        decay: parseFloat(getInputValue('fm_decay')),
        sustain: parseFloat(getInputValue('fm_sustain')),
        release: parseFloat(getInputValue('fm_release'))
      }
    });
  } else {
    const oscillatorConfig = { type: oscillator_type };
    if (waveform_count > 1) {
      oscillatorConfig.count = waveform_count;
      oscillatorConfig.spread = parseFloat(getInputValue('waveform_detune'));
    }

    synth = new Tone.MonoSynth({
      oscillator: oscillatorConfig,
      filter: {
        type: getInputValue('filter_type'),
        frequency: parseFloat(getInputValue('filter_frequency')),
        Q: parseFloat(getInputValue('filter_resonance'))
      },
      envelope: {
        attack: parseFloat(getInputValue('amp_attack')),
        decay: parseFloat(getInputValue('amp_decay')),
        sustain: parseFloat(getInputValue('amp_sustain')),
        release: parseFloat(getInputValue('amp_release'))
      },
      filterEnvelope: {
        attack: parseFloat(getInputValue('envelope_attack')),
        decay: parseFloat(getInputValue('envelope_decay')),
        sustain: parseFloat(getInputValue('envelope_sustain')),
        release: parseFloat(getInputValue('envelope_release')),
        baseFrequency: parseFloat(getInputValue('filter_frequency')),
        octaves: parseFloat(getInputValue('envelope_amount')) / 1200
      }
    });
  }

  const noiseEnvelope = new Tone.AmplitudeEnvelope({
    attack: parseFloat(getInputValue('amp_attack')),
    decay: parseFloat(getInputValue('amp_decay')),
    sustain: parseFloat(getInputValue('amp_sustain')),
    release: parseFloat(getInputValue('amp_release'))
  });

  const noise = new Tone.Noise({
    type: getInputValue('noise_type')
  });

  const crossFade = new Tone.CrossFade(noise_mix).toDestination();

  synth.connect(crossFade.a);
  noise.connect(noiseEnvelope);
  noiseEnvelope.connect(crossFade.b);

  const baseFreq = Tone.Frequency(note).toFrequency();
  const pitchAmount = parseFloat(getInputValue('pitch_amount'));
  const pitchAttack = parseFloat(getInputValue('pitch_attack'));
  const pitchDecay = parseFloat(getInputValue('pitch_decay'));
  const pitchSustain = parseFloat(getInputValue('pitch_sustain'));
  const pitchRelease = parseFloat(getInputValue('pitch_release'));
  const peakFreq = baseFreq * Math.pow(2, pitchAmount / 12);
  const sustainFreq = baseFreq + (peakFreq - baseFreq) * pitchSustain;
  const duration = Tone.Time(getInputValue('duration')).toSeconds();
  const now = Tone.now();
  const releaseTime = parseFloat(getInputValue('amp_release'));

  noise.start(now);
  noiseEnvelope.triggerAttackRelease(duration, now);
  synth.triggerAttack(note, now);
  synth.frequency.setValueAtTime(baseFreq, now);
  synth.frequency.linearRampToValueAtTime(peakFreq, now + pitchAttack);
  synth.frequency.linearRampToValueAtTime(sustainFreq, now + pitchAttack + pitchDecay);
  synth.frequency.setValueAtTime(sustainFreq, now + duration);
  synth.frequency.linearRampToValueAtTime(baseFreq, now + duration + pitchRelease);
  synth.triggerRelease(now + duration);

  const stopTime = now + duration + releaseTime;
  noise.stop(stopTime);

  Tone.Draw.schedule(() => {
    synth.dispose();
    noise.dispose();
    noiseEnvelope.dispose();
    crossFade.dispose();
  }, stopTime);
});

const searchInput = document.getElementById('search');

function filterRecipes() {
  const query = searchInput.value.toLowerCase();
  document.querySelectorAll('#recipes li').forEach(li => {
    const text = li.querySelector('a').textContent.toLowerCase();
    if (text.includes(query)) {
      li.classList.remove('hidden');
    } else {
      li.classList.add('hidden');
    }
  });
}

searchInput.addEventListener('keyup', filterRecipes);
window.addEventListener('DOMContentLoaded', filterRecipes);

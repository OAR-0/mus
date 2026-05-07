var SimpleSampler = (function() {
  var audioCtx = null;
  var sampleBuffers = {};
  var isLoaded = false;
  var loadProgress = 0;
  var loadCallbacks = [];

  // 每个乐器的采样配置（使用与实际文件名匹配的大小写）
  var SAMPLE_CONFIG = {
    'piano': { prefix: 'samples/piano-', notes: ['A0','A#0','B0','C1','C#1','D1','D#1','E1','F1','F#1','G1','G#1','A1','A#1','B1','C2','C#2','D2','D#2','E2','F2','F#2','G2','G#2','A2','A#2','B2','C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3','C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5','C#5','D5','D#5','E5','F5','F#5','G5','G#5','A5','A#5','B5','C6','C#6','D6','D#6','E6','F6','F#6','G6','G#6','A6','A#6','B6','C7','C#7','D7','D#7','E7','F7','F#7','G7','G#7','A7','A#7','B7','C8'] },
    'guitar': { prefix: 'samples/guitar-', notes: ['A2','As2','B2','C3','Cs3','D3','Ds3','E3','F3','Fs3','G3','Gs3','A3','As3','B3','C4','Cs4','D4','Ds4','E4','F4','Fs4','G4','Gs4','A4','As4','B4'] },
    'violin': { prefix: 'samples/violin-', notes: ['A4'] },
    'cello': { prefix: 'samples/cello-', notes: ['C2','Cs2','D2','Ds2','E2','F2','Fs2','G2','Gs2','A2','As2','B2','C3','Cs3','D3','Ds3','E3','F3','Fs3','G3','Gs3','A3','As3','B3','C4','Cs4','D4','Ds4','E4','F4','Fs4','G4','Gs4','A4','As4','B4','C5','Cs5','D5','Ds5','E5','F5','Fs5','G5','Gs5','A5','As5','B5','C6'], pitchOffset: 12, volumeBoost: 4.0 },
    'dizi': { prefix: 'samples/flute-', notes: ['A4','A5','A6','C4','C5','C6','C7','E4','E5','E6'] },
    'flute': { prefix: 'samples/flute-', notes: ['C4','Cs4','D4','Ds4','E4','F4','Fs4','G4','Gs4','A4','As4','B4','C5','Cs5','D5','Ds5','E5','F5','Fs5','G5','Gs5','A5','As5','B5','C6','D6','E6'], volumeBoost: 8.0 },
    'trumpet': { prefix: 'samples/trumpet-', notes: ['C4'] },
    'saxophone': { prefix: 'samples/saxophone-', notes: ['A4','A5','As3','As4','B3','B4','C4','C5','Cs3','Cs4','Cs5','D3','D4','D5','Ds3','Ds4','Ds5','E3','E4','E5','F3','F4','F5','Fs3','Fs4','Fs5','G3','G4','G5','Gs3','Gs4','Gs5'], volumeBoost: 1.5 },
    'clarinet': { prefix: 'samples/clarinet-', notes: ['A3','As3','B3','C4','Cs3','Cs4','D3','D4','Ds3','Ds4','E3','E4','F3','F4','Fs3','Fs4','G3','G4','Gs3','Gs4','A4','As4','B4'], volumeBoost: 4.0 },
    'frenchhorn': { prefix: 'samples/frenchhorn-', notes: ['A2','As2','A3','As3','A4','As4','C3','C4','D3','D4','E3','E4','F3','F4','G3','G4'], volumeBoost: 4.0 },
    'trombone': { prefix: 'samples/trombone-', notes: ['A2','As2','B2','E3','A3','As3','B3','C4','Cs4','D4','Ds4','E4','F4','Fs4','G4','Gs4','A4','As4','B4','C5','D5','E5','F5','G5','A5'], volumeBoost: 4.0 },
    'bass': { prefix: 'samples/bass-', notes: ['As1','As2','As3','As4','Cs1','Cs2','Cs3','Cs4','Cs5','E1','E2','E3','E4','G1','G2','G3','G4'], volumeBoost: 1.0 },
    'erhu': { prefix: 'samples/erhu-', notes: ['A5','A6','As5','As6','B5','B6','C6','C7','Cs6','Cs7','D5','D6','D7','Ds5','Ds6','E5','E6','F5','F6','Fs5','Fs6','G5','G6','Gs5','Gs6'], volumeBoost: 25.0, extension: 'wav', sustain: true },
    'bell': { prefix: 'samples/bell-', notes: ['C6'] },
    'drumkit': { 
      prefix: 'samples/', 
      notes: ['C4','D4','E4','F4','G4','A4','B4'],
      files: {
        'C4': 'drum-kick.mp3',
        'D4': 'drum-snare.mp3',
        'E4': 'drum-tom-high.mp3',
        'F4': 'drum-tom-mid-high.mp3',
        'G4': 'drum-tom-mid-low.mp3',
        'A4': 'drum-tom-low.mp3',
        'B4': 'drum-crash.mp3'
      },
      names: {
        'C4': '底鼓',
        'D4': '军鼓',
        'E4': '高音嗵',
        'F4': '中高嗵',
        'G4': '中低嗵',
        'A4': '落地嗵',
        'B4': '吊镲'
      },
      volumeBoost: 3.0,
      noteVolumeBoost: {
        'C4': 1.5,
        'D4': 1.3,
        'E4': 0.8,
        'F4': 0.9,
        'G4': 1.0,
        'A4': 1.1,
        'B4': 1.8
      }
    }
  };

  function noteToMidi(note) {
    var normalized = normalizeNoteName(note);
    // 修复正则表达式，确保正确匹配音符名称
    var match = normalized.match(/^([A-G])([#b]?)(\d+)$/i);
    if (!match) return 60;
    var noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    var noteName = match[1].toUpperCase() + (match[2] === '#' ? '#' : '');
    var octave = parseInt(match[3]);
    var noteIndex = noteNames.indexOf(noteName);
    if (noteIndex === -1) return 60;
    return (octave + 1) * 12 + noteIndex;
  }

  function setAudioContext(ctx) {
    audioCtx = ctx;
    
    if (window._pendingSampleData && audioCtx) {
      var instruments = Object.keys(window._pendingSampleData);
      var totalPending = 0;
      var decoded = 0;
      var failed = 0;
      
      instruments.forEach(function(inst) {
        totalPending += Object.keys(window._pendingSampleData[inst]).length;
      });
      
      if (totalPending === 0) {
        window._pendingSampleData = {};
        return;
      }
      
      instruments.forEach(function(inst) {
        var notes = Object.keys(window._pendingSampleData[inst]);
        
        if (!sampleBuffers[inst]) sampleBuffers[inst] = {};
        
        notes.forEach(function(note) {
          var buffer = window._pendingSampleData[inst][note];
          try {
            audioCtx.decodeAudioData(buffer.slice(0), function(decodedBuffer) {
              sampleBuffers[inst][note] = decodedBuffer;
              decoded++;
              
              if (decoded + failed === totalPending) {
                window._pendingSampleData = {};
              }
            }, function(e) {
              failed++;
              if (decoded + failed === totalPending) {
                window._pendingSampleData = {};
              }
            });
          } catch(e) {
            failed++;
            if (decoded + failed === totalPending) {
              window._pendingSampleData = {};
            }
          }
        });
      });
    }
  }

  function getIsLoaded() {
    return isLoaded;
  }

  function getLoadProgress() {
    return loadProgress;
  }

  function loadAllSamples(onProgress, onComplete, onError) {
    console.log('[DEBUG] loadAllSamples: 开始加载, SAMPLES_DATA存在=', !!window.SAMPLES_DATA);
    if (window.SAMPLES_DATA) {
      loadFromEmbeddedData(onProgress, function() {
        console.log('[DEBUG] loadAllSamples: 嵌入数据加载完成, sampleBuffers=', Object.keys(sampleBuffers));
        loadMissingInstrumentsFromFetch(function() {
          expandDrumkitOctaves();
          if (onComplete) onComplete();
        });
      });
      return;
    }
    
    loadAllFromFetch(onProgress, function() {
      expandDrumkitOctaves();
      if (onComplete) onComplete();
    }, onError);
  }
  
  function loadMissingInstrumentsFromFetch(onComplete) {
    var missingInstruments = [];
    Object.keys(SAMPLE_CONFIG).forEach(function(inst) {
      if (!sampleBuffers[inst] || Object.keys(sampleBuffers[inst]).length === 0) {
        missingInstruments.push(inst);
      }
    });
    
    console.log('[DEBUG] loadMissingInstrumentsFromFetch: 所有配置乐器 =', Object.keys(SAMPLE_CONFIG));
    console.log('[DEBUG] loadMissingInstrumentsFromFetch: 已加载乐器 =', Object.keys(sampleBuffers));
    console.log('[DEBUG] loadMissingInstrumentsFromFetch: 缺失乐器 =', missingInstruments);
    
    if (missingInstruments.length === 0) {
      console.log('[DEBUG] loadMissingInstrumentsFromFetch: 没有缺失乐器');
      isLoaded = true;
      if (onComplete) onComplete();
      return;
    }
    
    var loaded = 0;
    function loadNextInstrument() {
      if (loaded >= missingInstruments.length) {
        console.log('[DEBUG] loadMissingInstrumentsFromFetch: 所有缺失乐器加载完成');
        isLoaded = true;
        if (onComplete) onComplete();
        return;
      }
      
      var inst = missingInstruments[loaded];
      var config = SAMPLE_CONFIG[inst];
      sampleBuffers[inst] = {};
      
      console.log('[DEBUG] loadMissingInstrumentsFromFetch: 加载乐器', inst, '音符数 =', config.notes.length, '扩展名 =', config.extension || 'mp3');
      
      var noteIndex = 0;
      function loadNextNote() {
        if (noteIndex >= config.notes.length) {
          console.log('[DEBUG] loadMissingInstrumentsFromFetch: 乐器', inst, '加载完成，已加载', Object.keys(sampleBuffers[inst]).length, '个音符');
          loaded++;
          loadNextInstrument();
          return;
        }
        
        var note = config.notes[noteIndex];
        var url;
        if (config.files && config.files[note]) {
          url = config.files[note];
          if (config.prefix && !url.startsWith('http') && !url.startsWith('samples/')) {
            url = config.prefix + url;
          }
        } else {
          var ext = config.extension || 'mp3';
          url = config.prefix + note + '.' + ext;
        }
        
        console.log('[DEBUG] loadMissingInstrumentsFromFetch: 加载', inst, note, 'URL:', url);
        
        loadAudioFile(url, function(buffer) {
          sampleBuffers[inst][note] = buffer;
          console.log('[DEBUG] loadMissingInstrumentsFromFetch: 成功加载', inst, note);
          noteIndex++;
          loadNextNote();
        }, function(err) {
          console.log('[DEBUG] loadMissingInstrumentsFromFetch: 加载失败', inst, note, '错误:', err);
          noteIndex++;
          loadNextNote();
        });
      }
      
      loadNextNote();
    }
    
    loadNextInstrument();
  }
  
  function loadAllFromFetch(onProgress, onComplete, onError) {
    console.log('[DEBUG] loadAllFromFetch: 开始从文件系统加载采样');
    var instruments = Object.keys(SAMPLE_CONFIG);
    var totalFiles = 0;
    var loadedFiles = 0;

    // 计算总文件数
    instruments.forEach(function(inst) {
      totalFiles += SAMPLE_CONFIG[inst].notes.length;
    });
    
    console.log('[DEBUG] loadAllFromFetch: 总文件数 =', totalFiles, '乐器数 =', instruments.length);

    function loadInstrument(instIndex) {
      if (instIndex >= instruments.length) {
        isLoaded = true;
        console.log('[DEBUG] loadAllFromFetch: 所有乐器加载完成');
        if (onComplete) onComplete();
        return;
      }

      var inst = instruments[instIndex];
      var config = SAMPLE_CONFIG[inst];
      sampleBuffers[inst] = {};
      
      console.log('[DEBUG] loadAllFromFetch: 加载乐器', inst, '音符数 =', config.notes.length);

      var noteIndex = 0;
      function loadNextNote() {
        if (noteIndex >= config.notes.length) {
          loadInstrument(instIndex + 1);
          return;
        }

        var note = config.notes[noteIndex];
        var url;
        if (config.files && config.files[note]) {
          url = config.files[note];
          if (config.prefix && !url.startsWith('http') && !url.startsWith('samples/')) {
            url = config.prefix + url;
          }
        } else {
          var ext = config.extension || 'mp3';
          url = config.prefix + note + '.' + ext;
        }
        
        if (inst === 'clarinet') {
          console.log('[DEBUG] loadAllFromFetch: 单簧管采样 - 音符:', note, 'URL:', url);
        }

        loadAudioFile(url, function(buffer) {
          sampleBuffers[inst][note] = buffer;
          if (inst === 'clarinet') {
            console.log('[DEBUG] loadAllFromFetch: 单簧管采样加载成功 -', note);
          }
          loadedFiles++;
          loadProgress = loadedFiles / totalFiles;
          if (onProgress) onProgress(loadProgress);
          noteIndex++;
          loadNextNote();
        }, function(err) {
          // 加载失败也继续
          if (inst === 'clarinet') {
            console.log('[DEBUG] loadAllFromFetch: 单簧管采样加载失败 -', note, '错误:', err);
          }
          loadedFiles++;
          loadProgress = loadedFiles / totalFiles;
          if (onProgress) onProgress(loadProgress);
          noteIndex++;
          loadNextNote();
        });
      }

      loadNextNote();
    }

    loadInstrument(0);
  }
  
  function loadFromEmbeddedData(onProgress, onComplete) {
    var instruments = Object.keys(window.SAMPLES_DATA);
    var totalNotes = 0;
    var loadedNotes = 0;
    var failedNotes = 0;
    var pendingCount = 0;
    
    instruments.forEach(function(inst) {
      totalNotes += Object.keys(window.SAMPLES_DATA[inst]).length;
    });
    
    console.log('[DEBUG] loadFromEmbeddedData: 总音符数 =', totalNotes, '乐器数 =', instruments.length);
    
    if (totalNotes === 0) {
      console.log('[DEBUG] loadFromEmbeddedData: 没有嵌入数据，直接调用 onComplete');
      if (onComplete) onComplete();
      return;
    }
    
    function checkComplete() {
      console.log('[DEBUG] loadFromEmbeddedData checkComplete: loadedNotes=' + loadedNotes + ', failedNotes=' + failedNotes + ', pendingCount=' + pendingCount + ', totalNotes=' + totalNotes);
      if (loadedNotes + failedNotes + pendingCount === totalNotes) {
        console.log('[DEBUG] loadFromEmbeddedData: 所有嵌入数据处理完成');
        if (onComplete) onComplete();
      }
    }
    
    instruments.forEach(function(inst) {
      sampleBuffers[inst] = {};
      var notes = Object.keys(window.SAMPLES_DATA[inst]);
      
      notes.forEach(function(note) {
        var sampleData = window.SAMPLES_DATA[inst][note];
        try {
          var binaryString = atob(sampleData.data);
          var bytes = new Uint8Array(binaryString.length);
          for (var i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          if (audioCtx) {
            audioCtx.decodeAudioData(bytes.buffer.slice(0), function(buffer) {
              sampleBuffers[inst][note] = buffer;
              loadedNotes++;
              loadProgress = loadedNotes / totalNotes;
              if (onProgress) onProgress(loadProgress);
              checkComplete();
            }, function(e) {
              console.log('[DEBUG] loadFromEmbeddedData: 解码失败', inst, note, e);
              failedNotes++;
              if (onProgress) onProgress(loadProgress);
              checkComplete();
            });
          } else {
            if (!window._pendingSampleData) window._pendingSampleData = {};
            if (!window._pendingSampleData[inst]) window._pendingSampleData[inst] = {};
            window._pendingSampleData[inst][note] = bytes.buffer;
            pendingCount++;
            checkComplete();
          }
        } catch(e) {
          console.log('[DEBUG] loadFromEmbeddedData: 解析失败', inst, note, e);
          failedNotes++;
          checkComplete();
        }
      });
    });
  }

  function loadAudioFile(url, onSuccess, onError) {
    fetch(url)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.arrayBuffer();
      })
      .then(function(arrayBuffer) {
        if (audioCtx) {
          audioCtx.decodeAudioData(arrayBuffer, onSuccess, onError);
        } else {
          onError('无音频上下文');
        }
      })
      .catch(function(err) {
        onError(err.message || '加载失败');
      });
  }

  function findClosestNote(instBuffers, midiNote) {
    if (!instBuffers || Object.keys(instBuffers).length === 0) return null;

    var notes = Object.keys(instBuffers);
    var closestNote = notes[0];
    var closestDiff = Math.abs(noteToMidi(closestNote) - midiNote);

    for (var i = 1; i < notes.length; i++) {
      var diff = Math.abs(noteToMidi(notes[i]) - midiNote);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestNote = notes[i];
      }
    }

    return closestNote;
  }

  function midiToNoteName(midi) {
    var noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    var octave = Math.floor(midi / 12) - 1;
    var noteIndex = midi % 12;
    return noteNames[noteIndex] + octave;
  }

  function normalizeNoteName(noteName) {
    var name = noteName.toUpperCase();
    name = name.replace(/([A-G])S(\d)/g, '$1#$2');
    var match = name.match(/^([A-G])(#?)(\d+)$/);
    if (!match) return noteName;
    return match[1] + match[2] + match[3];
  }
  
  function noteToMidiOriginal(note) {
    var normalized = normalizeNoteName(note);
    var match = normalized.match(/^([A-G])([#b]?)(\d+)$/i);
    if (!match) return 60;
    var noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    var noteName = match[1].toUpperCase() + (match[2] === '#' ? '#' : '');
    var octave = parseInt(match[3]);
    var noteIndex = noteNames.indexOf(noteName);
    if (noteIndex === -1) return 60;
    return (octave + 1) * 12 + noteIndex;
  }

  function playNote(instName, midiNote, velocity, duration, trimStart, trimEnd, loopStart, loopEnd) {
    if (!audioCtx) {
      console.log('[DEBUG] playNote: 无音频上下文');
      return null;
    }

    var instConfig = SAMPLE_CONFIG[instName];
    var pitchOffset = (instConfig && instConfig.pitchOffset) ? instConfig.pitchOffset : 0;
    
    var adjustedMidiNote = midiNote - pitchOffset;
    var targetNoteName = midiToNoteName(adjustedMidiNote);
    
    var instBuffers = sampleBuffers[instName];
    
    console.log('[DEBUG] playNote: instName=' + instName + ', midiNote=' + midiNote + ', targetNoteName=' + targetNoteName + ', hasBuffers=' + !!(instBuffers && Object.keys(instBuffers).length > 0));
    if (instBuffers) {
      console.log('[DEBUG] playNote: bufferNotes=' + Object.keys(instBuffers).join(','));
    }
    
    var buffer = null;
    var playbackRate = 1.0;
    var usedSample = null;
    
    if (instBuffers && Object.keys(instBuffers).length > 0) {
      for (var noteKey in instBuffers) {
        if (normalizeNoteName(noteKey) === targetNoteName) {
          buffer = instBuffers[noteKey];
          usedSample = noteKey;
          playbackRate = 1.0;
          break;
        }
      }
      
      if (!buffer) {
        var closestNote = findClosestNote(instBuffers, adjustedMidiNote);
        if (closestNote) {
          buffer = instBuffers[closestNote];
          usedSample = closestNote;
          var sampleMidi = noteToMidi(closestNote);
          var pitchDiff = adjustedMidiNote - sampleMidi;
          playbackRate = Math.pow(2, pitchDiff / 12);
        }
      }
    }
    
    if (!buffer) {
      var pianoBuffers = sampleBuffers['piano'];
      if (pianoBuffers && Object.keys(pianoBuffers).length > 0) {
        for (var noteKey in pianoBuffers) {
          if (normalizeNoteName(noteKey) === targetNoteName) {
            buffer = pianoBuffers[noteKey];
            usedSample = 'piano:' + noteKey;
            playbackRate = 1.0;
            break;
          }
        }
        
        if (!buffer) {
          var closestNote = findClosestNote(pianoBuffers, midiNote);
          if (closestNote) {
            buffer = pianoBuffers[closestNote];
            usedSample = 'piano:' + closestNote;
            var sampleMidi = noteToMidi(closestNote);
            var pitchDiff = midiNote - sampleMidi;
            playbackRate = Math.pow(2, pitchDiff / 12);
          }
        }
      }
    }
    
    if (!buffer) {
      return null;
    }

    var source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    
    var volumeBoost = (instConfig && instConfig.volumeBoost) ? instConfig.volumeBoost : 1;
    var noteBoost = 1;
    if (instConfig && instConfig.noteVolumeBoost && usedSample) {
      if (instConfig.noteVolumeBoost[usedSample]) {
        noteBoost = instConfig.noteVolumeBoost[usedSample];
      } else {
        var baseNote = usedSample.charAt(0) + '4';
        if (instConfig.noteVolumeBoost[baseNote]) {
          noteBoost = instConfig.noteVolumeBoost[baseNote];
        }
      }
    }
    var gainNode = audioCtx.createGain();
    gainNode.gain.value = volumeBoost * noteBoost;
    source.connect(gainNode);
    
    return {
      source: source,
      gain: gainNode,
      buffer: buffer,
      trimStart: trimStart || 0,
      trimEnd: trimEnd !== undefined ? trimEnd : 1,
      stop: function() {
        try {
          source.stop();
        } catch(e) {}
      }
    };
  }

  // 用户上传采样
  function uploadSample(instName, noteName, file, onSuccess, onError, preDecodedBuffer) {
    if (preDecodedBuffer) {
      if (!sampleBuffers[instName]) {
        sampleBuffers[instName] = {};
      }
      sampleBuffers[instName][noteName] = preDecodedBuffer;
      if (onSuccess) onSuccess();
      return;
    }
    
    if (!audioCtx) {
      if (onError) onError('无音频上下文');
      return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      audioCtx.decodeAudioData(e.target.result, function(buffer) {
        if (!sampleBuffers[instName]) {
          sampleBuffers[instName] = {};
        }
        sampleBuffers[instName][noteName] = buffer;
        if (onSuccess) onSuccess();
      }, function(err) {
        if (onError) onError('解码失败');
      });
    };
    reader.onerror = function() {
      if (onError) onError('读取文件失败');
    };
    reader.readAsArrayBuffer(file);
  }

  // 获取已加载的采样列表
  function getLoadedSamples(instName) {
    if (!sampleBuffers[instName]) {
      console.log('[DEBUG] getLoadedSamples: 乐器', instName, '没有采样数据');
      return [];
    }
    var notes = Object.keys(sampleBuffers[instName]);
    console.log('[DEBUG] getLoadedSamples: 乐器', instName, '有', notes.length, '个采样:', notes);
    // 返回标准化后的音符名称（使用 # 格式）
    return notes.map(function(note) {
      return normalizeNoteName(note);
    });
  }

  // 删除采样
  function removeSample(instName, noteName) {
    if (sampleBuffers[instName] && sampleBuffers[instName][noteName]) {
      delete sampleBuffers[instName][noteName];
    }
  }

  function expandDrumkitOctaves() {
    if (!sampleBuffers['drumkit']) return;
    var drumBuffers = sampleBuffers['drumkit'];
    var baseNotes = ['C4','D4','E4','F4','G4','A4','B4'];
    var octaves = [1,2,3,5,6,7];
    octaves.forEach(function(oct) {
      baseNotes.forEach(function(baseNote) {
        var newNote = baseNote.charAt(0) + oct;
        if (!drumBuffers[newNote] && drumBuffers[baseNote]) {
          drumBuffers[newNote] = drumBuffers[baseNote];
        }
      });
    });
  }

  return {
    setAudioContext: setAudioContext,
    loadAllSamples: loadAllSamples,
    playNote: playNote,
    getIsLoaded: getIsLoaded,
    getLoadProgress: getLoadProgress,
    SAMPLE_CONFIG: SAMPLE_CONFIG,
    uploadSample: uploadSample,
    getLoadedSamples: getLoadedSamples,
    getSampleBuffers: function() { return sampleBuffers; },
    removeSample: removeSample
  };
})();

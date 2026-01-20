let ctx, masterGain, analyzer, reverbNode, airOn = false;
let oscs = [], filter;
const fingers = new Set();
const notes = { ni: 493.88, dha: 440.00, pa: 392.00, ma: 349.23, ga: 329.63, re: 293.66, sa: 261.63 };

async function initAudio() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyzer = ctx.createAnalyser();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    // Studio Reverb Engine
    reverbNode = ctx.createConvolver();
    const length = ctx.sampleRate * 2.5; 
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let i = 0; i < 2; i++) {
        let channel = impulse.getChannelData(i);
        for (let j = 0; j < length; j++) {
            channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 3);
        }
    }
    reverbNode.buffer = impulse;

    masterGain.connect(reverbNode);
    reverbNode.connect(analyzer);
    masterGain.connect(analyzer); 
    analyzer.connect(ctx.destination);
    startVisualizer();
}

function showPage(p) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    const target = document.getElementById(p + '-page');
    if(target) {
        target.classList.add('active');
        target.style.display = 'flex';
    }
}

function getFreq() {
    const keys = ['q', 'w', 'e', 'r', 't', 'y'];
    const noteKeys = ['ni', 'dha', 'pa', 'ma', 'ga', 're'];
    for(let i=0; i<keys.length; i++) {
        if(!fingers.has(keys[i])) return notes[noteKeys[i]];
    }
    return notes.sa;
}

function startAir() {
    if (!ctx || airOn) return;
    airOn = true;
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass"; 
    filter.frequency.value = 850; 

    const f = getFreq();
    oscs = [1, 2.001, 3.003].map((h, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f * h, ctx.currentTime);
        g.gain.value = i === 0 ? 0.5 : 0.08; 
        o.connect(g).connect(filter);
        o.start();
        return o;
    });

    filter.connect(masterGain);
    masterGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.1);
}

function stopAir() {
    if (!airOn) return;
    airOn = false;
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => { if(!airOn) oscs.forEach(o => { try{o.stop()} catch(e){} }); }, 400);
}

function update() {
    document.querySelectorAll('.hole').forEach(h => {
        const key = h.id.split('-')[1];
        h.classList.toggle('active', fingers.has(key));
    });

    if(airOn) {
        const f = getFreq();
        oscs.forEach((o, i) => {
            const h = [1, 2.001, 3.003][i];
            o.frequency.setTargetAtTime(f * h, ctx.currentTime, 0.1); 
        });
    }
}

function startVisualizer() {
    const canvas = document.getElementById('visualizer');
    const c = canvas.getContext('2d');
    function draw() {
        requestAnimationFrame(draw);
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const data = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(data);
        const avg = data.reduce((a,b) => a+b)/data.length;
        c.clearRect(0,0,canvas.width,canvas.height);
        c.fillStyle = `rgba(0, 212, 255, ${avg/350})`;
        c.beginPath(); c.arc(canvas.width/2, canvas.height/2, avg * 5, 0, Math.PI*2); c.fill();
    }
    draw();
}

document.getElementById('startBtn').addEventListener('click', async function() {
    if (!ctx) { await initAudio(); this.innerText = "Engine Active"; }
});

document.addEventListener("keydown", e => {
    if (e.repeat) return;
    if (e.code === "Space") { e.preventDefault(); startAir(); }
    const k = e.key.toLowerCase();
    if ("qwerty".includes(k)) { fingers.add(k); update(); }
});

document.addEventListener("keyup", e => {
    if (e.code === "Space") stopAir();
    const k = e.key.toLowerCase();
    if ("qwerty".includes(k)) { fingers.delete(k); update(); }
});
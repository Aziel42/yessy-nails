/**
 * ================================================================
 * YESSY NAILS — Sonidos Sutiles de Interfaz (Web Audio API)
 * Sin archivos .mp3 externos.
 * ================================================================
 */

(function () {
    let ctx = null;
    let enabled = localStorage.getItem('yessy_sounds_enabled') !== 'false';

    function ensureCtx() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        return ctx;
    }

    function playTone(freq, type = 'sine', duration = 0.08, volume = 0.04) {
        if (!enabled) return;
        const audioCtx = ensureCtx();
        if (!audioCtx) return;

        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = volume;

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;
            osc.start(now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.stop(now + duration);
        } catch (e) {
            // ignorar errores de audio
        }
    }

    const SOUND_LIBRARY = {
        click: () => playTone(880, 'sine', 0.05, 0.03),
        success: () => {
            // secuencia ascendente suave
            playTone(523, 'sine', 0.12, 0.03);
            setTimeout(() => playTone(659, 'sine', 0.12, 0.03), 120);
            setTimeout(() => playTone(784, 'sine', 0.12, 0.03), 240);
        },
        notify: () => playTone(1100, 'square', 0.1, 0.035)
    };

    function playSound(name) {
        if (!enabled) return;
        const fn = SOUND_LIBRARY[name];
        if (typeof fn === 'function') fn();
    }

    function toggleSounds() {
        enabled = !enabled;
        localStorage.setItem('yessy_sounds_enabled', enabled ? 'true' : 'false');
        updateSoundToggleUI();
        if (enabled) playSound('click');
        return enabled;
    }

    function updateSoundToggleUI() {
        const btn = document.getElementById('sound-toggle');
        if (btn) {
            btn.textContent = enabled ? '🔊' : '🔇';
            btn.setAttribute('aria-label', enabled ? 'Silenciar sonidos' : 'Activar sonidos');
            btn.title = enabled ? 'Silenciar sonidos' : 'Activar sonidos';
        }
    }

    // Delegación global: reproducir click en cualquier botón principal
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn, button');
        if (btn && enabled) {
            playSound('click');
        }
    });

    // Inicializar UI del toggle cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        updateSoundToggleUI();
    });

    // Exponer globalmente
    window.YESSY_SOUNDS = {
        play: playSound,
        toggle: toggleSounds,
        isEnabled: () => enabled
    };
})();
// Web Speech API Integration
class VoiceRecorder {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Web Speech API no soportada');
            this.supported = false;
            return;
        }

        this.recognition = new SpeechRecognition();
        this.supported = true;
        this.isRecording = false;
        this.transcript = '';

        this._setupRecognition();
    }

    _setupRecognition() {
        this.recognition.continuous = false; // Auto-stop cuando el usuario deja de hablar
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-AR'; // Spanish Argentine

        this.onComplete = null; // Callback para cuando termina

        this.recognition.onstart = () => {
            this.isRecording = true;
            this._updateUI('recording');
        };

        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }
            this.transcript = final;
            this._updateTranscript(final + interim);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            showToast(`Error en reconocimiento de voz: ${event.error}`, 'error');
            this._updateUI('error');
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this._updateUI('stopped');

            // Si hay transcript, avisar que terminó
            if (this.transcript.trim() && this.onComplete) {
                this.onComplete(this.transcript.trim());
            }
        };
    }

    start(onCompleteCallback) {
        if (!this.supported) {
            showToast('Web Speech API no está soportada en tu navegador', 'error');
            return;
        }
        this.transcript = '';
        this.onComplete = onCompleteCallback;
        this.recognition.start();
    }

    stop() {
        this.recognition.stop();
    }

    getTranscript() {
        return this.transcript.trim();
    }

    _updateUI(state) {
        const statusEl = document.getElementById('voiceStatus');
        const container = document.querySelector('.voice-nexus');

        if (state === 'recording') {
            statusEl.textContent = 'ESCUCHANDO...';
            container.classList.add('recording');
            if (window.navigator.vibrate) window.navigator.vibrate(40);
        } else if (state === 'stopped' || state === 'error') {
            statusEl.textContent = state === 'error' ? 'ERROR EN AUDIO' : 'HABLA AHORA';
            container.classList.remove('recording');
            if (state === 'stopped' && window.navigator.vibrate) window.navigator.vibrate([20, 20]);
        }
    }

    _updateTranscript(text) {
        const transcriptEl = document.getElementById('voiceTranscript');
        transcriptEl.textContent = text;
    }
}

const voiceRecorder = new VoiceRecorder();

function initVoiceRecorder() {
    if (!voiceRecorder.supported) {
        document.getElementById('voice-tab').innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                <p>⚠️ Web Speech API no está disponible en tu navegador.</p>
                <p>Por favor usa Firefox, Chrome, Edge o Safari.</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', initVoiceRecorder);

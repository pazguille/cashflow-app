// Gemini API Integration
class GeminiProcessor {
    constructor(apiKey) {
        this.apiKey = apiKey;
        // this.model = 'gemini-2.5-flash';
        this.model = 'gemini-2.5-flash-lite';
        this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    }

    async processText(text) {
        const prompt = this._buildPrompt(text);
        return await this._callGemini(prompt);
    }


    _buildPrompt(text) {
        return `Eres un asistente financiero. Extrae los datos de GASTO EXTRA del usuario.

REGLAS:
1. Extrae solo el concepto (nombre) y el monto total.
2. El resultado debe ser SIEMPRE un JSON con la estructura indicada.
3. Si no hay monto claro, estima o pon 0 y baja la confianza.

Entrada: "${text}"

Estructura JSON:
{
    "entries": [
        {
            "name": "Nombre del gasto",
            "amount": número positivo
        }
    ],
    "summary": "Breve resumen",
    "confidence": número (0-1)
}

No incluyas texto fuera del JSON. Si hay varios gastos, lístalos todos en "entries".`;
    }

    async _callGemini(prompt) {
        try {
            showSpinner(true);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topP: 0.8,
                        topK: 40,
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error en Gemini API');
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) {
                throw new Error('Respuesta vacía de Gemini');
            }

            // Limpiar markdown si existe
            let jsonStr = content.trim();
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(jsonStr);
            showSpinner(false);
            return parsed;

        } catch (error) {
            showSpinner(false);
            console.error('Gemini Error:', error);
            showToast(`Error al procesar con Gemini: ${error.message}`, 'error');
            throw error;
        }
    }

}

let geminiProcessor = null;

function getGeminiProcessor() {
    if (!config.isConfigured()) {
        showToast('Por favor configura tu API Key primero', 'error');
        return null;
    }
    if (!geminiProcessor || geminiProcessor.apiKey !== config.apiKey) {
        geminiProcessor = new GeminiProcessor(config.apiKey);
    }
    return geminiProcessor;
}

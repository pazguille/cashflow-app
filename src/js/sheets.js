import { config } from './config.js';
import { authManager } from './auth.js';
import { showToast, showSpinner } from './utils.js';

// Google Sheets API Integration con OAuth2
export class GoogleSheetsManager {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    }

    async addExpense(sheetId, sheetName, entries) {
        try {
            showSpinner(true);

            // 1. Obtener los datos actuales. Rango amplio para encontrar headers.
            const values = await this.getSheetData(sheetId, sheetName, 'A1:M60');

            if (!values || values.length === 0) {
                throw new Error('No se pudieron leer los datos del sheet');
            }

            const batchData = [];
            const savedItems = [];

            // RANGOS DEFINIDOS POR EL USUARIO: Filas 20 a 54
            const MIN_ROW = 20;
            const MAX_ROW = 54;

            // Iterar sobre cada entrada para encontrarle lugar
            for (const entry of entries) {
                let foundInFijos = false;
                let targetRange = '';
                let targetValues = null;
                let rowIndex = -1;

                // --- INTENTO 1: SECTION "FIJOS" (Columna G, I) ---
                for (let i = MIN_ROW - 1; i < MAX_ROW; i++) {
                    const rowData = values[i] || [];
                    // Verificar si la celda está vacía en local values
                    if (!rowData[6] || rowData[6].trim() === '') {
                        rowIndex = i;
                        const rowNumber = i + 1;
                        const concepto = entry.name;
                        const importe = entry.amount;
                        const colH = rowData[7] || ''; // Mantener columna H intacta

                        targetRange = `${sheetName}!G${rowNumber}:I${rowNumber}`;
                        targetValues = [[concepto, colH, importe]];
                        foundInFijos = true;

                        // ACTUALIZAR local values para que la siguiente iteración sepa que esta fila está ocupada
                        if (!values[i]) values[i] = [];
                        values[i][6] = concepto; // Marcar como ocupado
                        values[i][8] = importe;
                        break;
                    }
                }

                // --- INTENTO 2: SECTION "GASTOS EXTRA" (Columna K, L) (FALLBACK) ---
                if (!foundInFijos) {
                    for (let i = MIN_ROW - 1; i < MAX_ROW; i++) {
                        const rowData = values[i] || [];
                        if (!rowData[10] || rowData[10].trim() === '') {
                            rowIndex = i;
                            const rowNumber = i + 1;
                            targetRange = `${sheetName}!K${rowNumber}:L${rowNumber}`;
                            targetValues = [[entry.name, entry.amount]];

                            // ACTUALIZAR local values
                            if (!values[i]) values[i] = [];
                            values[i][10] = entry.name; // Marcar ocupado
                            values[i][11] = entry.amount;
                            break;
                        }
                    }
                }

                if (targetRange && targetValues) {
                    batchData.push({
                        range: targetRange,
                        values: targetValues
                    });
                    savedItems.push(entry.name);
                } else {
                    console.warn(`⚠️ No se encontró espacio para: ${entry.name}`);
                }
            }

            if (batchData.length === 0) {
                throw new Error('No se encontró espacio disponible para ningún gasto.');
            }

            // --- EJECUTAR BATCH UPDATE ---
            const url = `${this.baseUrl}/${sheetId}/values:batchUpdate`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    valueInputOption: 'USER_ENTERED',
                    data: batchData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error al actualizar sheet');
            }

            showSpinner(false);
            if (savedItems.length === 1) {
                showToast(`✅ Guardado: ${savedItems[0]}`, 'success');
            } else {
                showToast(`✅ ${savedItems.length} gastos guardados exitosamente`, 'success');
            }

            return await response.json();

        } catch (error) {
            showSpinner(false);
            console.error('Sheets Error:', error);
            showToast(`${error.message}`, 'error');
            throw error;
        }
    }

    async getSheetData(sheetId, sheetName, range = 'A1:M100') {
        try {
            showSpinner(true);

            const url = `${this.baseUrl}/${sheetId}/values/${sheetName}!${range}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error al leer Sheets');
            }

            const data = await response.json();
            showSpinner(false);

            return data.values || [];

        } catch (error) {
            showSpinner(false);
            console.error('Sheets Error:', error);
            showToast(`Error al leer datos: ${error.message}`, 'error');
            throw error;
        }
    }
}

let sheetsManager = null;

export function getSheetsManager() {
    if (!authManager || !authManager.isSignedIn()) {
        return null;
    }
    const token = authManager.getAccessToken();
    if (!sheetsManager || sheetsManager.accessToken !== token) {
        sheetsManager = new GoogleSheetsManager(token);
    }
    return sheetsManager;
}

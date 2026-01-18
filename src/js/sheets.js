// Google Sheets API Integration con OAuth2
class GoogleSheetsManager {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    }

    async addGastoExtra(sheetId, sheetName, entries) {
        try {
            showSpinner(true);

            // 1. Obtener los datos actuales para encontrar dónde insertar
            const values = await this.getSheetData(sheetId, sheetName, 'A1:M100');

            if (!values || values.length === 0) {
                throw new Error('No se pudieron leer los datos del sheet');
            }

            // 2. Encontrar la sección "Gastos Extra" (Columna K es índice 10)
            // Buscamos la ULTIMA ocurrencia por si hay varias
            let headerRowIndex = -1;
            for (let i = 0; i < values.length; i++) {
                if (values[i][10] === 'Gastos Extra') {
                    headerRowIndex = i;
                }
            }

            if (headerRowIndex === -1) {
                throw new Error('No se encontró la sección "Gastos Extra" en la columna K');
            }

            // 3. Encontrar la primera fila vacía después del header en columna K
            let targetRowIndex = -1;
            for (let i = headerRowIndex + 1; i < values.length; i++) {
                if (!values[i][10] || values[i][10].trim() === '') {
                    targetRowIndex = i;
                    break;
                }
            }

            // Si llegamos al final y no hay vacías, usamos la siguiente fila
            if (targetRowIndex === -1) {
                targetRowIndex = values.length;
            }

            // 4. Preparar la actualización (Columna K y L)
            const entry = entries[0]; // Por ahora procesamos de a uno o el primero
            const rowNumber = targetRowIndex + 1;
            const range = `${sheetName}!K${rowNumber}:L${rowNumber}`;

            const resource = {
                values: [[entry.name, entry.amount]]
            };

            const url = `${this.baseUrl}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`;

            const response = await fetch(url, {
                method: 'PUT', // Usamos PUT para update de un rango específico
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify(resource)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error al actualizar celda');
            }

            showSpinner(false);
            showToast(`✅ Gasto guardado: ${entry.name}`, 'success');
            return await response.json();

        } catch (error) {
            showSpinner(false);
            console.error('Sheets Error:', error);
            showToast(`Error al guardar: ${error.message}`, 'error');
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

function getSheetsManager() {
    if (!authManager || !authManager.isSignedIn()) {
        return null;
    }
    const token = authManager.getAccessToken();
    if (!sheetsManager || sheetsManager.accessToken !== token) {
        sheetsManager = new GoogleSheetsManager(token);
    }
    return sheetsManager;
}

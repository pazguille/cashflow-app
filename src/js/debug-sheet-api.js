#!/usr/bin/env node

/**
 * Script para debuggear la estructura del Google Sheet
 * Conecta directamente a la API y muestra:
 * - Headers (si existen)
 * - Datos actuales
 * - Problemas detectados
 * - Recomendaciones
 */

const SHEET_ID = '18Y6dRzPsEyQ3N0Ulii_6GvOKvOdcUzH4yj-bSzvlI9I';
const SHEET_NAME = 'Enero';

// Obtener token de acceso desde auth.js en el browser
// Por ahora, vamos a crear un helper para hacer la llamada

async function debugSheet(accessToken) {
    console.log('🔍 Analizando estructura del Google Sheet...\n');

    try {
        // 1. Leer datos actuales
        const sheetData = await fetchSheetData(accessToken, SHEET_ID, SHEET_NAME);

        // 2. Analizar estructura
        analyzeSheetStructure(sheetData);

        // 3. Detectar problemas
        detectProblems(sheetData);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function fetchSheetData(accessToken, sheetId, sheetName, range = 'A1:Z100') {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!${range}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        return data.values || [];

    } catch (error) {
        console.error('Error fetching sheet data:', error);
        throw error;
    }
}

function analyzeSheetStructure(values) {
    if (values.length === 0) {
        console.log('📊 El Sheet está VACÍO\n');
        return;
    }

    console.log('📊 ESTRUCTURA DEL SHEET:\n');

    // Headers
    const headers = values[0];
    console.log('📋 HEADERS (Fila 1):');
    headers.forEach((header, idx) => {
        const col = String.fromCharCode(65 + idx); // A, B, C, etc.
        console.log(`  ${col}: "${header}"`);
    });
    console.log();

    // Datos
    if (values.length > 1) {
        console.log('📝 DATOS (primeras 5 filas):\n');
        console.log('┌─────┬' + Array(headers.length).fill('─────────────┬').join(''));
        console.log('│ #  │' + headers.map(h => ` ${h.padEnd(11)} │`).join(''));
        console.log('├─────┼' + Array(headers.length).fill('─────────────┼').join(''));

        values.slice(1, 6).forEach((row, idx) => {
            const rowNum = idx + 2; // Empezar de fila 2
            const cells = headers.map((_, colIdx) =>
                (row[colIdx] || '').toString().padEnd(11)
            ).join(' │ ');
            console.log(`│ ${rowNum}  │ ${cells} │`);
        });

        console.log('├─────┼' + Array(headers.length).fill('─────────────┼').join(''));
        console.log(`│...  │ (${values.length - 1} filas de datos total)`);
        console.log('└─────┴' + Array(headers.length).fill('─────────────┴').join(''));
    }

    console.log();
    console.log(`Total de columnas: ${headers.length}`);
    console.log(`Total de filas (incluyendo headers): ${values.length}`);
    console.log();
}

function detectProblems(values) {
    if (values.length === 0) {
        console.log('⚠️  PROBLEMA: El Sheet está vacío');
        console.log('   Solución: Necesita encabezados en fila 1\n');
        return;
    }

    const headers = values[0];
    const dataRows = values.slice(1);

    console.log('🔎 ANÁLISIS DE PROBLEMAS:\n');

    let hasProblems = false;

    // 1. Verificar columnas esperadas
    const expectedColumns = ['Mes', 'Categoría', 'Ingresos', 'Gastos', 'Descripción', 'Fecha'];
    const actualColumns = headers.slice(0, 6);

    if (JSON.stringify(actualColumns) !== JSON.stringify(expectedColumns)) {
        hasProblems = true;
        console.log('❌ MISMATCH EN COLUMNAS:');
        console.log('   Esperadas: ' + expectedColumns.join(', '));
        console.log('   Actuales:  ' + actualColumns.join(', '));
        console.log();
    }

    // 2. Verificar filas vacías
    const emptyRows = dataRows.filter(row => !row || row.every(cell => !cell));
    if (emptyRows.length > 0) {
        hasProblems = true;
        console.log(`⚠️  FILAS VACÍAS: ${emptyRows.length} filas sin datos`);
        console.log();
    }

    // 3. Verificar formato de montos
    const amountColumns = [2, 3]; // Columnas C y D (Ingresos, Gastos)
    let inconsistentAmounts = false;

    dataRows.forEach((row, idx) => {
        amountColumns.forEach(colIdx => {
            const amount = row[colIdx];
            if (amount && isNaN(amount.toString().replace(/[$,. ]/g, ''))) {
                inconsistentAmounts = true;
            }
        });
    });

    if (inconsistentAmounts) {
        hasProblems = true;
        console.log('⚠️  MONTOS CON FORMATO INCONSISTENTE');
        console.log('   Algunos montos no son números válidos');
        console.log();
    }

    // 4. Verificar formato de fechas
    const dateColumn = 5; // Columna F
    let inconsistentDates = false;

    dataRows.forEach((row, idx) => {
        const date = row[dateColumn];
        if (date && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date.toString())) {
            inconsistentDates = true;
        }
    });

    if (inconsistentDates) {
        hasProblems = true;
        console.log('⚠️  FECHAS CON FORMATO INCONSISTENTE');
        console.log('   Se esperaba formato DD/MM/YYYY');
        console.log();
    }

    if (!hasProblems) {
        console.log('✅ No se detectaron problemas en la estructura');
        console.log();
    }
}

// ============================================
// HELPER FUNCTIONS PARA DEBUG
// ============================================

/**
 * Función para exportar datos como JSON
 */
function exportSheetAsJSON(accessToken) {
    return new Promise(async (resolve) => {
        try {
            const data = await fetchSheetData(accessToken, SHEET_ID, SHEET_NAME);
            const headers = data[0] || [];
            const rows = data.slice(1);

            const json = rows.map(row => {
                const obj = {};
                headers.forEach((header, idx) => {
                    obj[header] = row[idx] || '';
                });
                return obj;
            });

            console.log('📥 Datos exportados como JSON:');
            console.log(JSON.stringify(json, null, 2));
            resolve(json);
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

/**
 * Función para ver solo las columnas esperadas
 */
function checkExpectedColumns(accessToken) {
    return new Promise(async (resolve) => {
        try {
            const data = await fetchSheetData(accessToken, SHEET_ID, SHEET_NAME);
            const headers = data[0] || [];
            const expectedColumns = ['Mes', 'Categoría', 'Ingresos', 'Gastos', 'Descripción', 'Fecha'];

            console.log('🔍 VERIFICACIÓN DE COLUMNAS:\n');
            console.log('Esperadas:', expectedColumns);
            console.log('Actuales: ', headers.slice(0, 6));

            const match = JSON.stringify(headers.slice(0, 6)) === JSON.stringify(expectedColumns);
            console.log(match ? '✅ COINCIDEN' : '❌ NO COINCIDEN');

            resolve(!match);
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

/**
 * Función para ver la última fila agregada
 */
function getLastRow(accessToken) {
    return new Promise(async (resolve) => {
        try {
            const data = await fetchSheetData(accessToken, SHEET_ID, SHEET_NAME);
            if (data.length > 1) {
                const lastRow = data[data.length - 1];
                console.log(`📍 Última fila agregada (fila ${data.length}):`);
                console.table(lastRow);
                resolve(lastRow);
            } else {
                console.log('No hay datos');
                resolve(null);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

/**
 * Función para contar registros por mes
 */
function countByMonth(accessToken) {
    return new Promise(async (resolve) => {
        try {
            const data = await fetchSheetData(accessToken, SHEET_ID, SHEET_NAME);
            const headers = data[0] || [];
            const mesIdx = headers.indexOf('Mes');

            if (mesIdx === -1) {
                console.log('No se encontró columna "Mes"');
                resolve(null);
                return;
            }

            const counts = {};
            data.slice(1).forEach(row => {
                const mes = row[mesIdx] || 'Sin mes';
                counts[mes] = (counts[mes] || 0) + 1;
            });

            console.log('📊 Registros por mes:');
            console.table(counts);
            resolve(counts);
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

/**
 * Función para ver ingresos vs gastos totales
 */
function getTotals(accessToken) {
    return new Promise(async (resolve) => {
        try {
            const data = await fetchSheetData(accessToken, SHEET_ID, SHEET_NAME);
            const headers = data[0] || [];
            const ingresosIdx = headers.indexOf('Ingresos');
            const gastosIdx = headers.indexOf('Gastos');

            if (ingresosIdx === -1 || gastosIdx === -1) {
                console.log('No se encontraron columnas de Ingresos/Gastos');
                resolve(null);
                return;
            }

            let totalIngresos = 0;
            let totalGastos = 0;

            data.slice(1).forEach(row => {
                const ingresos = parseFloat(row[ingresosIdx] || 0);
                const gastos = parseFloat(row[gastosIdx] || 0);
                totalIngresos += ingresos;
                totalGastos += gastos;
            });

            const balance = totalIngresos - totalGastos;

            console.log('💰 TOTALES:\n');
            console.log(`  Ingresos:  $${totalIngresos.toFixed(2)}`);
            console.log(`  Gastos:    $${totalGastos.toFixed(2)}`);
            console.log(`  Balance:   $${balance.toFixed(2)}\n`);

            resolve({totalIngresos, totalGastos, balance});
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

// ============================================
// ASIGNAR AL WINDOW PARA USAR EN CONSOLA
// ============================================

window.debugSheet = debugSheet;
window.exportSheetAsJSON = exportSheetAsJSON;
window.checkExpectedColumns = checkExpectedColumns;
window.getLastRow = getLastRow;
window.countByMonth = countByMonth;
window.getTotals = getTotals;

// ============================================
// MENSAJE DE BIENVENIDA
// ============================================

console.log('%c🔍 SCRIPT DE DEBUG CARGADO', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
console.log('%cFunciones disponibles en consola:', 'color: #2196F3; font-weight: bold;');
console.log('%c1. debugSheet(accessToken)  - Análisis completo de la estructura', 'color: #666;');
console.log('%c2. exportSheetAsJSON(accessToken) - Exportar datos como JSON', 'color: #666;');
console.log('%c3. checkExpectedColumns(accessToken) - Verificar si las columnas coinciden', 'color: #666;');
console.log('%c4. getLastRow(accessToken)  - Ver última fila agregada', 'color: #666;');
console.log('%c5. countByMonth(accessToken) - Contar registros por mes', 'color: #666;');
console.log('%c6. getTotals(accessToken)   - Ver ingresos/gastos totales', 'color: #666;');
console.log('\n%cEjemplo: const token = authManager.getAccessToken(); debugSheet(token);', 'color: #FF9800; font-style: italic;');

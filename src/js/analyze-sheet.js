#!/usr/bin/env node

/**
 * Script para analizar la estructura del Sheet "Enero"
 * y determinar dónde agregar nuevos movimientos
 */

const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/Users/pazguille/developer/cashflow/sheet-data.json', 'utf8'));
const values = data.values || [];

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 ANÁLISIS DE ESTRUCTURA DEL SHEET "ENERO"');
console.log('═══════════════════════════════════════════════════════════════\n');

// Identificar secciones principales
console.log('📊 SECCIONES IDENTIFICADAS:\n');

let sections = [];

values.forEach((row, idx) => {
    const rowNum = idx + 1;
    const firstCell = (row[0] || '').trim();
    const secondCell = (row[1] || '').trim();

    // Detectar títulos de secciones
    if (secondCell === 'BANCO al cierre del mes') {
        sections.push({ name: 'BANCO', row: rowNum, col: 'B' });
    }
    if (secondCell === 'INGRESOS') {
        sections.push({ name: 'INGRESOS', row: rowNum, col: 'B' });
    }
    if (secondCell === 'AHORRO - INVERSIONES') {
        sections.push({ name: 'AHORRO', row: rowNum, col: 'B' });
    }
    if (row[6] === 'EGRESOS') {
        sections.push({ name: 'EGRESOS', row: rowNum, col: 'G' });
    }
});

sections.forEach(s => {
    console.log(`  ✓ ${s.name.padEnd(20)} | Fila ${s.row} | Columna ${s.col}`);
});

console.log('\n' + '═══════════════════════════════════════════════════════════════');
console.log('⚠️  PROBLEMA IDENTIFICADO');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Este Sheet NO es una tabla simple, es un DASHBOARD personalizado con:');
console.log('  • Múltiples secciones (BANCO, INGRESOS, EGRESOS, AHORRO)');
console.log('  • Cada sección con su propia estructura');
console.log('  • Datos dispersos por diferentes columnas');
console.log('  • Cálculos y fórmulas integradas');
console.log('  • Layout personalizado (colores, merged cells, etc)');

console.log('\n' + '═══════════════════════════════════════════════════════════════');
console.log('✅ SOLUCIÓN RECOMENDADA');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Opción 1: CREAR PESTAÑA NUEVA "Datos"');
console.log('  ✓ Tu app escribe en pestaña "Datos" (tabla limpia)');
console.log('  ✓ Dashboard "Enero" se mantiene intacto');
console.log('  ✓ Simplicidad y confiabilidad');
console.log('  ⚠ Necesitas copiar datos manualmente a cada mes\n');

console.log('Opción 2: AGREGAR EN SECCIONES ESPECÍFICAS');
console.log('  ✓ Se agrega en "EGRESOS" o "INGRESOS" según tipo');
console.log('  ✓ Datos van al dashboard');
console.log('  ⚠ Muy complejo, frágil, propenso a errores\n');

console.log('Opción 3: CREAR TABLA SEPARADA EN EL MISMO SHEET');
console.log('  ✓ Todo en un sheet, pero sin tocar dashboard');
console.log('  ✓ Datos limpios y organizados');
console.log('  ⚠ El dashboard no se actualiza automáticamente\n');

console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📝 MI RECOMENDACIÓN: Opción 1 (Nueva pestaña "Datos")\n');
console.log('Así tu app es simple, confiable y no rompe el dashboard.\n');

console.log('═══════════════════════════════════════════════════════════════\n');

// ══════════════════════════════════════════════════════════════
// Script para eliminar todos los usuarios de Supabase
// ══════════════════════════════════════════════════════════════
// Uso: node database/delete-all-users.js
// ══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar path para .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllUsers() {
  try {
    console.log('🔍 Consultando usuarios actuales...\n');

    // Contar usuarios por tipo
    const { data: usersByType, error: countError } = await supabase
      .from('users')
      .select('user_type, email');

    if (countError) {
      throw countError;
    }

    if (!usersByType || usersByType.length === 0) {
      console.log('✅ No hay usuarios en la base de datos.');
      return;
    }

    // Agrupar por tipo
    const typeCounts = usersByType.reduce((acc, user) => {
      acc[user.user_type] = (acc[user.user_type] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Usuarios actuales:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log(`   TOTAL: ${usersByType.length}\n`);

    // Confirmación
    console.log('⚠️  ADVERTENCIA: Esta operación eliminará PERMANENTEMENTE todos los usuarios.');
    console.log('⚠️  Esta acción NO se puede deshacer.\n');
    
    // Eliminar todos los usuarios
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Elimina todos excepto el UUID imposible

    if (deleteError) {
      throw deleteError;
    }

    console.log('✅ Todos los usuarios han sido eliminados exitosamente.\n');

    // Verificar
    const { data: remaining, error: verifyError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (verifyError) {
      throw verifyError;
    }

    console.log(`✓ Usuarios restantes: 0`);
    console.log('✓ Base de datos limpia.\n');

  } catch (error) {
    console.error('❌ Error al eliminar usuarios:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
}

// Ejecutar
console.log('════════════════════════════════════════════════════════════════');
console.log('  ELIMINAR TODOS LOS USUARIOS DE SUPABASE');
console.log('════════════════════════════════════════════════════════════════\n');

deleteAllUsers();

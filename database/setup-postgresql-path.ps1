# Script para agregar PostgreSQL al PATH de Windows
# Ejecutar como Administrador

$postgresPath = "C:\Program Files\PostgreSQL\18\bin"

# Obtener el PATH actual del sistema
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

# Verificar si PostgreSQL ya está en el PATH
if ($currentPath -like "*$postgresPath*") {
    Write-Host "✅ PostgreSQL ya está en el PATH" -ForegroundColor Green
} else {
    # Agregar PostgreSQL al PATH
    $newPath = $currentPath + ";" + $postgresPath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "✅ PostgreSQL agregado al PATH del sistema" -ForegroundColor Green
    Write-Host "⚠️  Reinicia PowerShell para que los cambios surtan efecto" -ForegroundColor Yellow
}

# Mostrar cómo usar psql
Write-Host ""
Write-Host "📋 Comandos útiles de PostgreSQL:" -ForegroundColor Cyan
Write-Host "  psql -U postgres -d lusty_db          # Conectarse a la base de datos"
Write-Host "  psql -U postgres -l                    # Listar todas las bases de datos"
Write-Host "  psql -U postgres -d lusty_db -c '\dt'  # Ver tablas en lusty_db"

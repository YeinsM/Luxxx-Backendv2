# Sistema de Verificación de Email

## Descripción General

Este sistema implementa la verificación de email obligatoria para todos los nuevos usuarios antes de permitirles iniciar sesión en la plataforma.

## Flujo de Trabajo

### 1. Registro de Usuario

Cuando un usuario se registra en cualquiera de las rutas:
- `POST /api/auth/register/escort`
- `POST /api/auth/register/member`
- `POST /api/auth/register/agency`
- `POST /api/auth/register/club`

El backend:
1. ✅ Crea la cuenta con `emailVerified: false`
2. ✅ Genera un token único de verificación (UUID)
3. ✅ Establece fecha de expiración del token (24 horas)
4. ✅ Envía email con link de verificación
5. ✅ **NO retorna token JWT** (usuario no puede hacer login aún)
6. ✅ Retorna mensaje: "Registro exitoso. Por favor verifica tu email antes de iniciar sesión."

### 2. Verificación de Email

El usuario recibe un email con un link como:
```
https://tudominio.com/verify-email?token=abc123...
```

El frontend debe:
1. Capturar el token del parámetro URL
2. Llamar a `GET /api/auth/verify-email?token=abc123...`

El backend:
1. ✅ Busca usuario por token
2. ✅ Verifica que el token no haya expirado (24 horas)
3. ✅ Actualiza `emailVerified: true`
4. ✅ Limpia token de verificación
5. ✅ Envía email de bienvenida
6. ✅ **Retorna token JWT** para auto-login opcional

### 3. Inicio de Sesión

Cuando un usuario intenta hacer login en `POST /api/auth/login`:

El backend:
1. ✅ Valida credenciales (email/password)
2. ✅ **Verifica que `emailVerified === true`**
3. ✅ Si no verificado → rechaza con error: "Por favor verifica tu email antes de iniciar sesión"
4. ✅ Si verificado → permite login normal

### 4. Reenvío de Email de Verificación

Si el usuario perdió el email o expiró el token:

Endpoint: `POST /api/auth/resend-verification`

```json
{
  "email": "usuario@example.com"
}
```

El backend:
1. ✅ Busca usuario por email
2. ✅ Verifica que NO esté ya verificado
3. ✅ Genera nuevo token
4. ✅ Actualiza fecha de expiración (24 horas nuevas)
5. ✅ Reenvía email de verificación

## Endpoints API

### Verificar Email
```http
GET /api/auth/verify-email?token={token}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Email verificado exitosamente",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

**Errores:**
- 400: Token inválido o expirado

### Reenviar Verificación
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "usuario@example.com"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Email de verificación reenviado"
}
```

**Errores:**
- 400: Email no encontrado
- 400: Email ya verificado

## Cambios en Base de Datos

### Campos Nuevos en Tabla `users`:

```sql
email_verification_token VARCHAR(255)      -- Token UUID para verificación
email_verification_expires TIMESTAMP       -- Fecha de expiración (24h)
```

### Migración para Bases de Datos Existentes:

Ejecuta el archivo de migración:
```bash
database/migrations/001_add_email_verification.sql
```

O manualmente:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token);
```

## Configuración de Email

Asegúrate de tener configuradas las siguientes variables de entorno:

```env
# Email Service (Zoho SMTP)
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@dominio.com
EMAIL_PASSWORD=tu-password
EMAIL_FROM=noreply@dominio.com
EMAIL_FROM_NAME=Lusty

# Frontend URL (para links de verificación)
FRONTEND_URL=http://localhost:3000
```

## Integración Frontend

### 1. Después del Registro

```typescript
const response = await fetch('/api/auth/register/member', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});

if (response.ok) {
  const data = await response.json();
  // data.message: "Registro exitoso. Por favor verifica tu email..."
  // Mostrar mensaje al usuario
  // Redirigir a página de "Verifica tu email"
}
```

### 2. Página de Verificación

```typescript
// En /verify-email?token=abc123
const token = new URLSearchParams(window.location.search).get('token');

const response = await fetch(`/api/auth/verify-email?token=${token}`);

if (response.ok) {
  const data = await response.json();
  // Email verificado exitosamente
  // Opcional: Auto-login con data.token
  localStorage.setItem('token', data.data.token);
  // Redirigir a dashboard
}
```

### 3. Manejo de Error en Login

```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

if (!response.ok) {
  const error = await response.json();
  if (error.error === 'Por favor verifica tu email antes de iniciar sesión') {
    // Mostrar botón para reenviar verificación
  }
}
```

### 4. Reenviar Verificación

```typescript
const response = await fetch('/api/auth/resend-verification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});

if (response.ok) {
  // Mostrar: "Email de verificación enviado"
}
```

## Plantilla de Email

El email de verificación incluye:
- ✅ Diseño profesional con gradientes
- ✅ Botón prominente "Verificar Email"
- ✅ Link que expira en 24 horas
- ✅ Mensaje de ignorar si no creó la cuenta
- ✅ Responsive para móviles

## Seguridad

✅ **Tokens únicos**: UUID v4 - prácticamente imposible de adivinar  
✅ **Expiración**: 24 horas máximo  
✅ **Un solo uso**: Token se elimina después de verificación  
✅ **Hash seguro**: Las contraseñas se guardan con bcrypt  
✅ **Validación**: Express-validator en todos los endpoints  

## Testing

### Registro + Verificación Manual

1. Registra un usuario:
```bash
curl -X POST http://localhost:5000/api/auth/register/member \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456","city":"Santo Domingo"}'
```

2. Revisa la consola del backend para ver el token generado

3. Verifica el email:
```bash
curl "http://localhost:5000/api/auth/verify-email?token=TOKEN_AQUI"
```

4. Intenta login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### Prueba de Reenvío

```bash
curl -X POST http://localhost:5000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Preguntas Frecuentes

### ¿Qué pasa si el token expira?
El usuario puede solicitar un nuevo token usando el endpoint de reenvío.

### ¿Los usuarios existentes necesitan verificar?
No, solo los nuevos registros. Si quieres que usuarios existentes verifiquen, puedes hacer un update masivo:
```sql
UPDATE users SET email_verified = true WHERE created_at < '2026-02-11';
```

### ¿Puedo cambiar el tiempo de expiración?
Sí, modifica la línea en `auth.service.ts`:
```typescript
verificationExpires.setHours(verificationExpires.getHours() + 24); // Cambiar 24
```

### ¿Cómo desactivar temporalmente la verificación?
Comenta la validación en el método `login()` de `auth.service.ts`:
```typescript
// if (!user.emailVerified) {
//   throw new UnauthorizedError('Por favor verifica tu email antes de iniciar sesión');
// }
```

## Próximos Pasos (Opcional)

- [ ] Agregar recordatorios automáticos si no se verifica en X días
- [ ] Dashboard admin para ver usuarios no verificados
- [ ] Rate limiting en endpoint de reenvío
- [ ] Verificación por SMS como alternativa
- [ ] Email de recordatorio antes de que expire el token

# Cloudinary Image & Video Upload - Documentación

## Configuración

Las credenciales de Cloudinary están configuradas en el archivo `.env`:

```env
CLOUDINARY_CLOUD_NAME=dixbv1o8s
CLOUDINARY_API_KEY=472385254352828
CLOUDINARY_API_SECRET=Mn7vAVQN2woUtc7QeeeigD5EICQ
```

## Nuevos Endpoints de Perfil - Fotos y Videos

### 1. Obtener fotos del usuario autenticado

**GET** `/api/profile/media/photos`

Obtiene todas las fotos del usuario actual.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Photos retrieved successfully",
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "lusty/users/user-id/photos/abc123",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "resourceType": "image",
      "uploadedAt": "2024-02-08T10:30:00.000Z"
    }
  ]
}
```

### 2. Subir fotos al perfil

**POST** `/api/profile/media/photos`

Sube fotos al perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "photos": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
  ]
}
```

**Response:**
```json
{
  "message": "2 photos uploaded successfully",
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "lusty/users/user-id/photos/abc123",
      "width": 1920,
      "height": 1080,
      "format": "webp",
      "resourceType": "image",
      "uploadedAt": "2024-02-08T10:30:00.000Z"
    }
  ]
}
```

### 3. Eliminar foto del perfil

**DELETE** `/api/profile/media/photos`

Elimina una foto del perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "publicId": "lusty/users/user-id/photos/abc123"
}
```

**Response:**
```json
{
  "message": "Photo deleted successfully"
}
```

### 4. Obtener videos del usuario autenticado

**GET** `/api/profile/media/videos`

Obtiene todos los videos del usuario actual.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Videos retrieved successfully",
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "lusty/users/user-id/videos/xyz789",
      "width": 1920,
      "height": 1080,
      "format": "mp4",
      "resourceType": "video",
      "uploadedAt": "2024-02-08T10:30:00.000Z"
    }
  ]
}
```

### 5. Subir videos al perfil

**POST** `/api/profile/media/videos`

Sube videos al perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "videos": [
    "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEA..."
  ]
}
```

**Response:**
```json
{
  "message": "1 videos uploaded successfully",
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "lusty/users/user-id/videos/xyz789",
      "width": 1920,
      "height": 1080,
      "format": "mp4",
      "resourceType": "video",
      "uploadedAt": "2024-02-08T10:30:00.000Z"
    }
  ]
}
```

### 6. Eliminar video del perfil

**DELETE** `/api/profile/media/videos`

Elimina un video del perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "publicId": "lusty/users/user-id/videos/xyz789"
}
```

**Response:**
```json
{
  "message": "Video deleted successfully"
}
```

## Endpoints Generales de Upload

### 1. Subir una imagen (Base64)

**POST** `/api/upload/image`

Sube una imagen codificada en base64 a Cloudinary.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...", // Base64 string
  "folder": "lusty/escorts", // Opcional, default: "lusty/users"
  "tags": ["profile", "escort"] // Opcional
}
```

**Response:**
```json
{
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/dixbv1o8s/image/upload/v1234567890/lusty/escorts/abc123.webp",
    "publicId": "lusty/escorts/abc123",
    "width": 1920,
    "height": 1080,
    "format": "webp",
    "resourceType": "image"
  }
}
```

### 2. Subir múltiples imágenes

**POST** `/api/upload/images`

Sube múltiples imágenes codificadas en base64.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
  ],
  "folder": "lusty/galleries",
  "tags": ["gallery", "photos"]
}
```

**Response:**
```json
{
  "message": "2 images uploaded successfully",
  "data": [
    {
      "url": "https://res.cloudinary.com/dixbv1o8s/...",
      "publicId": "lusty/galleries/img1",
      "width": 1920,
      "height": 1080,
      "format": "webp",
      "resourceType": "image"
    },
    {
      "url": "https://res.cloudinary.com/dixbv1o8s/...",
      "publicId": "lusty/galleries/img2",
      "width": 1280,
      "height": 720,
      "format": "webp",
      "resourceType": "image"
    }
  ]
}
```

### 3. Eliminar una imagen

**DELETE** `/api/upload/image`

Elimina una imagen de Cloudinary usando su public ID.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "publicId": "lusty/escorts/abc123"
}
```

**Response:**
```json
{
  "message": "Image deleted successfully",
  "data": {
    "result": "ok"
  }
}
```

### 4. Eliminar múltiples imágenes

**DELETE** `/api/upload/images`

Elimina múltiples imágenes de Cloudinary.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "publicIds": [
    "lusty/galleries/img1",
    "lusty/galleries/img2"
  ]
}
```

### 5. Obtener URL optimizada (público)

**GET** `/api/upload/optimized-url?publicId=lusty/escorts/abc123&width=400&height=400&crop=thumb&quality=auto&format=webp`

Genera una URL optimizada de una imagen con transformaciones aplicadas.

**Query Parameters:**
- `publicId` (requerido): Public ID de la imagen
- `width` (opcional): Ancho deseado
- `height` (opcional): Alto deseado
- `crop` (opcional): Tipo de recorte (`scale`, `fit`, `fill`, `pad`, `thumb`)
- `quality` (opcional): Calidad de la imagen (`auto` o número)
- `format` (opcional): Formato de salida (`webp`, `jpg`, `png`)

**Response:**
```json
{
  "message": "Optimized URL generated",
  "data": {
    "url": "https://res.cloudinary.com/dixbv1o8s/image/upload/c_thumb,h_400,q_auto,w_400/lusty/escorts/abc123.webp"
  }
}
```

## Estructura de Carpetas en Cloudinary

```
lusty/
├── users/          # Imágenes generales de usuarios
├── escorts/        # Fotos de perfiles de escorts
├── members/        # Fotos de perfiles de members
├── agencies/       # Logos y fotos de agencias
├── clubs/          # Logos y fotos de clubs
└── galleries/      # Galerías de fotos
```

## Uso desde el Frontend

### Ejemplo con fetch API:

```typescript
// Convertir archivo a base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Subir imagen
const uploadImage = async (file: File, folder: string = 'lusty/users') => {
  try {
    const base64Image = await fileToBase64(file);
    
    const response = await fetch('http://localhost:5000/api/upload/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: base64Image,
        folder,
        tags: ['profile'],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data.data; // Returns { url, publicId, width, height, format }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Uso:
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const result = await uploadImage(file, 'lusty/escorts');
    console.log('Image URL:', result.url);
    // Guardar result.url en el estado o enviar al backend
  } catch (error) {
    console.error('Error uploading:', error);
  }
};
```

### Componente React de ejemplo:

```tsx
import { useState } from 'react';

export const ImageUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadImage(file);
      setImageUrl(result.url);
    } catch (error) {
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {imageUrl && <img src={imageUrl} alt="Uploaded" style={{ maxWidth: '300px' }} />}
    </div>
  );
};
```

## Transformaciones Automáticas

Todas las imágenes subidas se optimizan automáticamente con:

- **Formato:** WebP (mejor compresión)
- **Calidad:** Auto (Cloudinary optimiza automáticamente)
- **Lazy Loading:** Compatible con lazy loading nativo del navegador

## Límites y Consideraciones

- Tamaño máximo de imagen: 10MB por imagen (configurable)
- Formatos soportados: JPG, PNG, WebP, GIF
- Las imágenes se almacenan en la nube de Cloudinary, no en tu servidor
- Los thumbnails se generan on-the-fly usando transformaciones de URL

## Seguridad

- Todos los endpoints de upload/delete requieren autenticación (JWT)
- El endpoint de URL optimizada es público (solo lectura)
- Las imágenes son públicas una vez subidas a Cloudinary
- Para imágenes privadas, considera usar signed URLs de Cloudinary

## Testing

```bash
# Test con curl
curl -X POST http://localhost:5000/api/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "folder": "lusty/test"
  }'
```

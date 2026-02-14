# API Testing with cURL

## Health Check
```bash
curl http://localhost:5000/api/health
```

## Register Escort
```bash
curl -X POST http://localhost:5000/api/auth/register/escort \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sofia Martinez",
    "email": "sofia@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "city": "Madrid",
    "age": 25
  }'
```

## Register Member
```bash
curl -X POST http://localhost:5000/api/auth/register/member \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "city": "Barcelona"
  }'
```

## Register Agency
```bash
curl -X POST http://localhost:5000/api/auth/register/agency \
  -H "Content-Type: application/json" \
  -d '{
    "agencyName": "Elite Escorts",
    "email": "info@elite.com",
    "password": "password123",
    "phone": "+1234567890",
    "city": "Valencia",
    "website": "https://elite.com"
  }'
```

## Register Club
```bash
curl -X POST http://localhost:5000/api/auth/register/club \
  -H "Content-Type: application/json" \
  -d '{
    "clubName": "Paradise Club",
    "email": "info@paradise.com",
    "password": "password123",
    "phone": "+1234567890",
    "address": "123 Main Street",
    "city": "Sevilla",
    "website": "https://paradise.com",
    "openingHours": "22:00 - 06:00"
  }'
```

## Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sofia@example.com",
    "password": "password123"
  }'
```

## Get Current User (Protected)
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## PowerShell Examples

### Register Escort (PowerShell)
```powershell
$body = @{
  name = "Sofia Martinez"
  email = "sofia@example.com"
  password = "password123"
  phone = "+1234567890"
  city = "Madrid"
  age = 25
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register/escort" -Method Post -Body $body -ContentType "application/json"
```

### Login (PowerShell)
```powershell
$body = @{
  email = "sofia@example.com"
  password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.data.token
```

### Get Current User (PowerShell)
```powershell
$headers = @{
  Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method Get -Headers $headers
```

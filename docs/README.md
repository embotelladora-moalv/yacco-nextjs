# Documentación Técnica - Yacco ERP

## 1. Arquitectura
Ver `docs/ARQUITECTURA.md`.

## 2. Convenciones de Código
Ver `docs/CONTRIBUTING.md`.

## 3. Base de Datos
Firestore con reglas en `firestore.rules`.

## 4. Despliegue
Vercel + Firebase.

## 5. Seeding de Datos
Para cargar datos iniciales en el entorno de desarrollo, existe el endpoint `GET /api/seed`.

### Requisitos
1. El sistema debe estar corriendo en modo desarrollo (`NODE_ENV !== "production"`).
2. Se debe incluir el header `x-seed-token` con el valor configurado en la variable de entorno `SEED_TOKEN`.

### Ejemplo de uso (cURL)
```bash
curl -H "x-seed-token: tu-token-seguro" http://localhost:3000/api/seed
```

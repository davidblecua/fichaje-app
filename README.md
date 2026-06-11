# Fichaje App

Aplicación web personal para registrar horas de trabajo como autónomo.
Permite fichar entradas y salidas, asociar proyectos/clientes, y exportar los datos a un fichero Excel.

---

## Estructura del proyecto

```
fichaje-app/
├── backend/          # API FastAPI (Python 3.11)
├── frontend/         # SPA React 18 + Vite
├── data/             # Volumen Docker: aquí se guardan el .db y el .xlsx
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 1. Arrancar en local con Docker Compose

### Requisitos previos
- Docker Desktop instalado y en ejecución
- Docker Compose v2 (incluido en Docker Desktop)

### Pasos

```bash
# 1. Clonar o descomprimir el proyecto
cd fichaje-app

# 2. Crear el fichero de variables de entorno
cp .env.example .env
# (Editar .env si es necesario — los valores por defecto funcionan en local)

# 3. Crear el directorio de datos (si no existe)
mkdir -p data

# 4. Construir y arrancar los contenedores
docker compose up --build -d

# 5. Comprobar que todo está en marcha
docker compose ps
docker compose logs -f
```

La aplicación estará disponible en:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Documentación API (Swagger):** http://localhost:8000/docs

### Parar la aplicación

```bash
docker compose down
```

### Ver logs

```bash
docker compose logs backend   # Solo logs del backend
docker compose logs frontend  # Solo logs del frontend
docker compose logs -f        # Todos los logs en tiempo real
```

---

## 2. Desplegar en TrueNAS Scale

TrueNAS Scale incluye soporte nativo para Docker Compose a través de su interfaz de Apps,
o puedes usarlo directamente vía SSH.

### Opción A: Vía SSH (recomendado para más control)

```bash
# 1. Conectarse al servidor TrueNAS por SSH
ssh admin@<IP-de-TrueNAS>

# 2. Crear un directorio para la app en el pool de datos
mkdir -p /mnt/tank/apps/fichaje-app
cd /mnt/tank/apps/fichaje-app

# 3. Subir los ficheros del proyecto (desde tu PC):
# scp -r ./fichaje-app/* admin@<IP-TrueNAS>:/mnt/tank/apps/fichaje-app/

# 4. Crear el .env con la IP del servidor
cp .env.example .env
nano .env
```

Editar el `.env` con los valores correctos para TrueNAS:

```env
# Reemplazar 192.168.1.100 con la IP real de tu TrueNAS
CORS_ORIGINS=http://192.168.1.100:3000
VITE_API_URL=http://192.168.1.100:8000
```

> ⚠️ **IMPORTANTE:** `VITE_API_URL` debe ser la IP que tu navegador puede alcanzar,
> no el nombre de contenedor interno de Docker. El frontend React se ejecuta en tu
> navegador, no dentro del servidor.

```bash
# 5. Arrancar
mkdir -p data
docker compose up --build -d
```

### Opción B: Vía interfaz web de TrueNAS (Custom App)

1. Ir a **Apps** → **Discover** → **Custom App**
2. Pegar el contenido de `docker-compose.yml`
3. Configurar las variables de entorno en la interfaz
4. Crear el storage dataset y mapearlo al path `./data`

### Acceso desde la red local

Desde cualquier dispositivo en la misma red:
- Frontend: `http://<IP-TrueNAS>:3000`
- API: `http://<IP-TrueNAS>:8000`

---

## 3. Acceder al fichero Excel generado

El fichero Excel se guarda en la carpeta `data/` del proyecto, que está montada
como volumen Docker. Desde fuera del contenedor, el fichero está en:

```
fichaje-app/
└── data/
    ├── fichajes.db      ← Base de datos SQLite
    └── fichajes.xlsx    ← Fichero Excel (se crea al pulsar "Exportar a Excel")
```

### En local (Docker Desktop)
El directorio `./data` está en la carpeta donde clonaste el proyecto.
Puedes abrirlo con cualquier explorador de archivos.

### En TrueNAS
El directorio está en el path que configuraste en el pool:
```
/mnt/tank/apps/fichaje-app/data/fichajes.xlsx
```
Accesible via:
- **SMB/SAMBA** si tienes un share configurado apuntando al pool
- **SSH/SCP:** `scp admin@<IP>:/mnt/tank/apps/fichaje-app/data/fichajes.xlsx .`
- **Explorador web de TrueNAS:** Dataset Browser

### Contenido del Excel
- Una hoja por mes (formato `YYYY-MM`, ej: `2025-06`)
- Columnas: Fecha | Entrada | Salida | Horas | Proyecto | Tarea | Pausa | Facturado | Notas
- Fila de totales al final de cada hoja
- Colores: verde para registros facturados, amarillo para pausas

---

## 4. Desarrollo local (sin Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate           # Windows

pip install -r requirements.txt

# Crear el directorio de datos local
mkdir -p ../data

# Variables de entorno para desarrollo
export DATABASE_URL="sqlite:////../data/fichajes.db"
export EXCEL_PATH="../data/fichajes.xlsx"
export CORS_ORIGINS="http://localhost:5173"

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Crear fichero .env.local para desarrollo
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev   # Arranca en http://localhost:5173
```

---

## 5. Referencia de endpoints API

| Método   | Endpoint              | Descripción                              |
|----------|-----------------------|------------------------------------------|
| GET      | `/health`             | Health check                             |
| GET      | `/fichajes/estado`    | Estado actual (trabajando / sin fichar)  |
| POST     | `/fichajes/entrada`   | Registrar entrada                        |
| POST     | `/fichajes/salida`    | Registrar salida                         |
| GET      | `/fichajes`           | Listar fichajes (con filtros opcionales) |
| PATCH    | `/fichajes/{id}`      | Editar un fichaje                        |
| DELETE   | `/fichajes/{id}`      | Eliminar un fichaje                      |
| GET      | `/fichajes/proyectos` | Lista de proyectos únicos                |
| POST     | `/export/excel`       | Generar/actualizar el fichero Excel      |

Documentación interactiva completa en: `http://localhost:8000/docs`

---

## 6. Pasos futuros para portar el frontend a React Native

El proyecto está diseñado desde el principio para facilitar esta migración:

### Por qué es sencillo

1. **Toda la lógica está en el backend** — el frontend solo llama a la API REST.
2. **`src/api/client.js` es portable** — usa `fetch` nativo, disponible en React Native.
3. **`src/hooks/useFichaje.js` es portable sin cambios** — no usa APIs de browser.
4. **Los componentes son stateless** — solo reciben props y llaman a callbacks.

### Pasos concretos

```bash
# 1. Crear nuevo proyecto React Native (o Expo, recomendado)
npx create-expo-app fichaje-mobile
cd fichaje-mobile

# 2. Copiar los ficheros portables sin modificación
cp ../fichaje-app/frontend/src/api/client.js ./src/api/client.js
cp ../fichaje-app/frontend/src/hooks/useFichaje.js ./src/hooks/useFichaje.js

# 3. Reescribir los componentes JSX
# - Reemplazar <div> por <View>, <p> por <Text>, <button> por <TouchableOpacity>
# - Reemplazar CSS Modules por StyleSheet.create()
# - Reemplazar <input type="date"> por @react-native-community/datetimepicker
# - Reemplazar <table> por <FlatList>

# 4. La URL del backend en producción
# Cambiar VITE_API_URL por una variable de entorno de Expo o constante:
# const BASE_URL = "http://<IP-servidor>:8000";
```

### Dependencias recomendadas para React Native

```json
{
  "@react-native-community/datetimepicker": "para selectores de fecha",
  "react-native-paper": "componentes UI listos para móvil",
  "@react-navigation/native": "navegación entre pantallas"
}
```

---

## Solución de problemas frecuentes

### El frontend no puede conectar con el backend

Verificar que `VITE_API_URL` en el `.env` apunta a una IP/hostname que el
**navegador** (no Docker) puede alcanzar. En TrueNAS, debe ser la IP de la máquina,
no `localhost` ni el nombre del contenedor.

### El fichero Excel no se genera

- Verificar que el directorio `./data` existe y tiene permisos de escritura.
- Comprobar que hay registros cerrados (con salida) en la base de datos.
- Ver los logs del backend: `docker compose logs backend`

### La base de datos se pierde al reiniciar

Asegurarse de que el volumen está correctamente montado. En `docker-compose.yml`:
```yaml
volumes:
  - ./data:/app/data
```
El directorio `./data` debe existir antes de ejecutar `docker compose up`.

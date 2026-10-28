# Ejemplos con curl

Con la aplicación arrancada (`docker compose up`). La opción `-c`/`-b` guarda y reenvía la cookie de sesión.
Los ejemplos son para bash (Linux, macOS, Git Bash). En PowerShell usa `curl.exe` y escapa las comillas del JSON.

```bash
BASE=http://localhost:8085/api

# Sin sesión -> 401
curl -i $BASE/clientes

# Login (guarda la cookie en cookies.txt)
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"demo@empresa.local","password":"Demo1234!"}' $BASE/auth/login

# Listado con búsqueda, filtros y paginación
curl -b cookies.txt "$BASE/clientes?q=ebro"
curl -b cookies.txt "$BASE/clientes?estado=Activo&pais=Espa%C3%B1a&comercial=Jordi%20Puig&page=1&pageSize=5"

# Ficha de un cliente
curl -b cookies.txt $BASE/clientes/1

# Crear
curl -b cookies.txt -H "Content-Type: application/json" -d '{
  "empresa": "Talleres Pérez SL", "cif": "B99999999", "estado": "Activo",
  "ciudad": "Huesca", "pais": "España", "comercial": "Elena Sanz",
  "contactos": [{ "nombre": "Pedro Pérez", "email": "pedro@talleresperez.es" }]
}' $BASE/clientes

# Actualizar (sin "contactos": los contactos no se modifican)
curl -b cookies.txt -X PUT -H "Content-Type: application/json" -d '{
  "empresa": "Construcciones Ebro SL", "cif": "B50123456", "estado": "Inactivo",
  "direccion": "Calle Alfonso I, 12", "cp": "50003", "ciudad": "Zaragoza",
  "pais": "España", "comercial": "Elena Sanz", "fechaAlta": "2025-01-14"
}' $BASE/clientes/1

# Histórico
curl -b cookies.txt $BASE/clientes/1/historico

# Eliminar (borrado lógico)
curl -b cookies.txt -X DELETE -i $BASE/clientes/7

# Cerrar sesión
curl -b cookies.txt -X POST -i $BASE/auth/logout
```

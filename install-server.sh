#!/bin/bash

# Script de instalación del backend DIFERCO en VPS
# Para ejecutar: bash install-server.sh

set -e

echo "======================================"
echo "  INSTALACIÓN BACKEND DIFERCO"
echo "======================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
APP_DIR="/var/www/diferco-backend"
DB_NAME="diferco_videos"
DB_USER="root"
SQL_FILE="diferco_videos_export.sql"

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Verificar que estamos ejecutando como usuario correcto
print_info "Verificando usuario..."
if [ "$EUID" -eq 0 ]; then
    print_info "Ejecutando como root"
else
    print_info "Ejecutando como usuario: $(whoami)"
fi

# 1. Actualizar sistema
print_info "Actualizando sistema..."
sudo apt update -y
print_success "Sistema actualizado"

# 2. Verificar si Node.js está instalado
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js ya instalado: $NODE_VERSION"
else
    print_info "Instalando Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js instalado: $(node -v)"
fi

# 3. Verificar si MySQL está instalado
if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version)
    print_success "MySQL ya instalado: $MYSQL_VERSION"
else
    print_error "MySQL no está instalado. Por favor instálalo primero:"
    echo "sudo apt install mysql-server -y"
    exit 1
fi

# 4. Instalar PM2 globalmente
if command -v pm2 &> /dev/null; then
    print_success "PM2 ya instalado: $(pm2 -v)"
else
    print_info "Instalando PM2..."
    sudo npm install -g pm2
    print_success "PM2 instalado"
fi

# 5. Crear directorio de aplicación
print_info "Creando directorio de aplicación..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
print_success "Directorio creado: $APP_DIR"

# 6. Copiar archivos (asumiendo que ya están en /tmp)
if [ -f "/tmp/$SQL_FILE" ]; then
    print_info "Importando base de datos..."

    # Solicitar contraseña de MySQL
    echo -e "\n${YELLOW}Por favor ingresa la contraseña de MySQL root:${NC}"

    # Importar base de datos
    mysql -u $DB_USER -p < "/tmp/$SQL_FILE"

    if [ $? -eq 0 ]; then
        print_success "Base de datos importada exitosamente"
    else
        print_error "Error al importar la base de datos"
        exit 1
    fi
else
    print_error "Archivo SQL no encontrado en /tmp/$SQL_FILE"
    echo "Por favor sube el archivo diferco_videos_export.sql a /tmp/"
    exit 1
fi

# 7. Copiar código del backend si está en /tmp
if [ -d "/tmp/backend" ]; then
    print_info "Copiando archivos del backend..."
    cp -r /tmp/backend/* $APP_DIR/
    print_success "Archivos copiados"
elif [ -f "/tmp/backend.tar.gz" ]; then
    print_info "Extrayendo backend..."
    tar -xzf /tmp/backend.tar.gz -C $APP_DIR
    print_success "Backend extraído"
else
    print_info "Archivos del backend no encontrados en /tmp/"
    print_info "Por favor copia los archivos manualmente a $APP_DIR"
fi

# 8. Instalar dependencias
if [ -f "$APP_DIR/package.json" ]; then
    print_info "Instalando dependencias de Node.js..."
    cd $APP_DIR
    npm install --production
    print_success "Dependencias instaladas"
else
    print_error "package.json no encontrado en $APP_DIR"
    exit 1
fi

# 9. Configurar .env
if [ -f "$APP_DIR/.env.production" ]; then
    print_info "Configurando variables de entorno..."
    cp $APP_DIR/.env.production $APP_DIR/.env
    print_success "Variables de entorno configuradas"
else
    print_error "Archivo .env.production no encontrado"
    echo "Por favor crea el archivo .env manualmente en $APP_DIR"
fi

# 10. Configurar firewall
print_info "Configurando firewall..."
sudo ufw allow 3001/tcp
print_success "Puerto 3001 abierto"

# 11. Iniciar aplicación con PM2
print_info "Iniciando aplicación con PM2..."
cd $APP_DIR

# Detener si ya está corriendo
pm2 delete diferco-backend 2>/dev/null || true

# Iniciar
pm2 start server.js --name diferco-backend
pm2 save

print_success "Aplicación iniciada"

# 12. Configurar PM2 para inicio automático
print_info "Configurando inicio automático..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

print_success "Inicio automático configurado"

# 13. Mostrar estado
echo ""
echo "======================================"
print_success "¡INSTALACIÓN COMPLETADA!"
echo "======================================"
echo ""
echo "Estado de la aplicación:"
pm2 status

echo ""
echo "Ver logs:"
echo "  pm2 logs diferco-backend"
echo ""
echo "Probar API:"
echo "  curl http://localhost:3001/api/videos"
echo ""
echo "Comandos útiles:"
echo "  pm2 restart diferco-backend  # Reiniciar"
echo "  pm2 stop diferco-backend     # Detener"
echo "  pm2 logs diferco-backend     # Ver logs"
echo ""

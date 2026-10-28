-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('Activo', 'Inactivo');

-- CreateEnum
CREATE TYPE "AccionHistorial" AS ENUM ('CREAR', 'MODIFICAR', 'ELIMINAR');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "empresa" VARCHAR(200) NOT NULL,
    "cif" VARCHAR(20) NOT NULL,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'Activo',
    "direccion" VARCHAR(200),
    "cp" VARCHAR(10),
    "ciudad" VARCHAR(100),
    "pais" VARCHAR(100),
    "comercial" VARCHAR(100),
    "fecha_alta" DATE NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "eliminado_en" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "email" VARCHAR(200),
    "telefono" VARCHAR(30),

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "fecha" DATE NOT NULL,
    "base_imponible" DECIMAL(12,2) NOT NULL,
    "iva_porcentaje" DECIMAL(5,2) NOT NULL,
    "iva_importe" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_cambios" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "entidad" VARCHAR(20) NOT NULL,
    "registro_id" INTEGER NOT NULL,
    "accion" "AccionHistorial" NOT NULL,
    "campo" VARCHAR(50),
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_cambios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importaciones" (
    "id" SERIAL NOT NULL,
    "archivo" VARCHAR(200) NOT NULL,
    "hash_archivo" VARCHAR(64) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filas_leidas" INTEGER NOT NULL,
    "clientes_creados" INTEGER NOT NULL,
    "contactos_creados" INTEGER NOT NULL,
    "facturas_creadas" INTEGER NOT NULL,
    "duplicados" INTEGER NOT NULL,
    "rechazadas" INTEGER NOT NULL,
    "incidencias" JSONB NOT NULL,

    CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cif_key" ON "clientes"("cif");

-- CreateIndex
CREATE INDEX "clientes_estado_idx" ON "clientes"("estado");

-- CreateIndex
CREATE INDEX "clientes_pais_idx" ON "clientes"("pais");

-- CreateIndex
CREATE INDEX "clientes_comercial_idx" ON "clientes"("comercial");

-- CreateIndex
CREATE INDEX "contactos_cliente_id_idx" ON "contactos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_numero_key" ON "facturas"("numero");

-- CreateIndex
CREATE INDEX "facturas_cliente_id_idx" ON "facturas"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_hash_key" ON "sesiones"("token_hash");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");

-- CreateIndex
CREATE INDEX "historial_cambios_cliente_id_fecha_idx" ON "historial_cambios"("cliente_id", "fecha");

-- AddForeignKey
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_cambios" ADD CONSTRAINT "historial_cambios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_cambios" ADD CONSTRAINT "historial_cambios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

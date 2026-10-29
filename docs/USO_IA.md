# Uso de Inteligencia Artificial

## 1. Introducción

Durante el desarrollo de esta prueba técnica he utilizado **Claude Code** (CLI de Anthropic, modelo Claude Opus 5.5) como herramienta de apoyo a la programación.

Considero que la inteligencia artificial es especialmente útil en el desarrollo de software porque permite agilizar tareas repetitivas, generar estructuras de código, proponer soluciones y detectar posibles errores. Sin embargo, su utilización requiere comprender los requisitos, supervisar los resultados y comprobar que las soluciones implementadas funcionan correctamente.

El proyecto se ha desarrollado mediante un proceso de trabajo iterativo, combinando la definición de requisitos, las tareas de programación, la asistencia de Claude Code y las comprobaciones posteriores.

Claude Code ha generado parte del código, las pruebas automatizadas y la documentación a partir de mis instrucciones, y ha aplicado las modificaciones que le he ido solicitando. También se ha utilizado para resolver incidencias y ejecutar las comprobaciones técnicas.

Las decisiones sobre el alcance del proyecto, las funcionalidades necesarias y las modificaciones solicitadas se han realizado siguiendo los requisitos de la prueba técnica.

Este documento recoge los principales prompts utilizados, las tareas realizadas con asistencia de IA y las verificaciones efectuadas durante el desarrollo.

## 2. Metodología de trabajo

El uso de Claude Code no se ha limitado a generar una respuesta y dar el proyecto por terminado.

El proceso ha consistido en definir los requisitos de cada fase, solicitar implementaciones o modificaciones, revisar los resultados obtenidos y realizar comprobaciones para detectar posibles problemas.

Cuando una funcionalidad necesitaba ajustes, se planteaban nuevas instrucciones para corregirla o mejorarla.

Este procedimiento se ha aplicado tanto durante la implementación inicial como en las posteriores revisiones del proyecto.

La IA ha permitido acelerar especialmente la escritura de código, la preparación de pruebas y la identificación de errores. Las funcionalidades se han validado mediante pruebas automatizadas, comprobaciones de la API y pruebas manuales de la aplicación.

## 3. Principales prompts utilizados

A continuación se presenta un resumen representativo de las instrucciones utilizadas durante el desarrollo.

Las fases 3.1 a 3.5 se definieron con varios prompts pequeños comprobando todo antes de seguir y haciendo modificaciones de código donde hiciera falta. Las instrucciones que se muestran resumen cada apartado. Las fases 3.6 y 3.7 corresponden a prompts posteriores, planteados a partir de los resultados obtenidos.

### 3.1. Análisis y planificación

**Objetivo:** comprender los requisitos de la prueba técnica y organizar su implementación.

Ejemplo de instrucción resumida:

> Analiza el documento de requisitos y el CSV proporcionado. Identifica las funcionalidades obligatorias, los posibles problemas de los datos y propone una estructura sencilla, mantenible y adecuada para una prueba técnica.

Durante esta fase se definieron las tecnologías principales:

- Backend: Node.js, TypeScript y Express.
- Frontend: React y Vite.
- Base de datos: PostgreSQL y Prisma.
- Validaciones: Zod.
- Pruebas: Vitest.
- Entorno de ejecución: Docker Compose.

Se priorizó una arquitectura comprensible y fácil de mantener, evitando añadir complejidad innecesaria.

### 3.2. Base de datos e importación CSV

**Objetivo:** implementar el almacenamiento de clientes, contactos y facturas, junto con la importación de los datos proporcionados.

Ejemplo de instrucción resumida:

> Implementa la estructura de base de datos y la importación del CSV. Comprueba los formatos de fechas e importes, detecta duplicados, evita inventar información y permite repetir la importación sin duplicar registros.

Se trabajó sobre la normalización de los datos, las relaciones entre entidades y el tratamiento de registros incorrectos.

También se realizaron comprobaciones para verificar que los datos importados coincidían con los resultados esperados.

### 3.3. Desarrollo de la API

**Objetivo:** implementar las operaciones necesarias para gestionar clientes y contactos.

Ejemplo de instrucción resumida:

> Desarrolla los endpoints necesarios para consultar, crear, modificar y eliminar clientes. Añade validaciones, búsqueda, filtros, paginación y respuestas de error claras.

La API se organizó separando rutas, controladores y servicios.

Se incorporaron validaciones de entrada y mecanismos para gestionar errores y evitar operaciones inconsistentes.

### 3.4. Autenticación e histórico

**Objetivo:** proteger el acceso a la aplicación y registrar las modificaciones realizadas.

Ejemplo de instrucción resumida:

> Añade autenticación segura y un histórico de modificaciones. Los cambios deben registrar el usuario, el campo modificado y sus valores anterior y nuevo. Evita generar entradas de histórico cuando no existan cambios reales.

Se implementó autenticación mediante sesiones almacenadas en base de datos y cookies HttpOnly.

El histórico se integró con las operaciones de actualización para conservar la trazabilidad de los cambios.

### 3.5. Interfaz web

**Objetivo:** desarrollar una aplicación que permita utilizar las funcionalidades de la API de forma sencilla.

Ejemplo de instrucción resumida:

> Crea una interfaz en React, en español y adaptable a distintos tamaños de pantalla, que permita iniciar sesión, consultar clientes, gestionar sus datos y visualizar el histórico de modificaciones.

Durante esta fase se trabajó en las pantallas de acceso, listado, detalle y formularios.

Posteriormente, la interfaz se comprobó manualmente en el navegador para verificar el funcionamiento de las principales operaciones.

### 3.6. Pruebas y corrección de errores

**Objetivo:** comprobar la estabilidad de la aplicación y corregir los problemas detectados.

Ejemplo de instrucción resumida:

> Revisa las funcionalidades implementadas, ejecuta las pruebas y comprueba los posibles errores. Antes de modificar el código, intenta reproducir el problema y evita realizar cambios innecesarios en la arquitectura o en funcionalidades que ya funcionan.

Se realizaron pruebas de normalización, importación, autenticación, validaciones, búsqueda, filtros e histórico.

En la auditoría posterior se añadieron pruebas (de 40 a 50) para comprobar situaciones adicionales y corregir los errores confirmados.

### 3.7. Revisión final y documentación

**Objetivo:** preparar el proyecto para su entrega y facilitar su instalación.

Ejemplo de instrucción resumida:

> Revisa el proyecto antes de la entrega. Comprueba que se puede instalar desde un repositorio limpio, que la documentación es clara, que no se publican credenciales y que las funcionalidades existentes continúan funcionando.

Se revisaron el README, los ejemplos de uso de la API, la configuración de Docker y las variables de entorno.

También se comprobó la instalación del proyecto en un entorno independiente.

## 4. Supervisión y comprobaciones

Una parte importante del proceso ha sido comprobar que el código generado o modificado con ayuda de IA cumplía los requisitos de la prueba.

Las verificaciones se realizaron de dos formas complementarias.

### 4.1. Pruebas técnicas

Claude Code ejecutó las siguientes comprobaciones:

- Pruebas unitarias y de integración.
- Compilación del backend y del frontend.
- Comprobación de los tipos de TypeScript.
- Pruebas de importación del CSV.
- Peticiones a la API para comprobar las respuestas y validaciones.
- Arranque y reconstrucción de los servicios mediante Docker.
- Instalación desde una copia limpia del repositorio.

Estas pruebas permitieron detectar errores y comprobar que las modificaciones no afectaban negativamente al funcionamiento de otras partes del proyecto.

Claude Code no tuvo acceso a un navegador, por lo que la interfaz se comprobó manualmente.

### 4.2. Pruebas manuales

Además de las comprobaciones técnicas, probé personalmente la aplicación desde el navegador.

Entre las funcionalidades verificadas se encuentran:

- Inicio de sesión.
- Visualización del listado de clientes.
- Consulta de información de clientes.
- Creación, modificación y eliminación de clientes.
- Gestión de contactos.
- Validaciones de formularios.
- Detección de CIF duplicado.
- Búsqueda y filtros.
- Consulta del histórico de modificaciones.
- Adaptación de la interfaz a una pantalla móvil.

La paginación se comprobó mediante pruebas de la API, aunque no se realizó una verificación manual específica desde el navegador.

Los resultados de estas comprobaciones sirvieron para identificar aspectos que necesitaban ajustes y solicitar nuevas correcciones.

## 5. Incidencias y mejoras realizadas

Durante el desarrollo y las revisiones posteriores se detectaron diferentes situaciones que requirieron modificaciones.

| Incidencia detectada | Solución aplicada |
|---|---|
| Diferentes formatos de fechas e importes en el CSV | Se incorporaron funciones de normalización y validación. |
| Posibilidad de duplicar datos al repetir una importación | Se implementaron comprobaciones para evitar duplicados. |
| Validación incorrecta de determinadas fechas (`2026-09-31` se aceptaba como 1 de octubre) | Se sustituyó por una validación estricta. |
| Identificadores fuera del rango permitido | Se añadieron límites para devolver errores controlados. |
| Claude Code intentó preparar la base de datos de pruebas con un comando que la borraba, y Prisma lo bloqueó | En lugar de saltarse esa protección, se cambió a un procedimiento que no borra datos y que solo vacía bases de datos de prueba. |
| Problemas de configuración de Vitest y Prisma | Se ajustaron los archivos de configuración y los scripts necesarios. |
| Errores al ejecutar el proyecto desde una instalación limpia | Se corrigió la generación del cliente de Prisma y la configuración de Docker. |
| Conflictos con puertos utilizados por otros servicios | Se modificaron los puertos de desarrollo. |
| Configuración de credenciales de demostración | Se eliminaron los valores por defecto y se trasladó la configuración al archivo `.env`. |

Las correcciones se acompañaron de nuevas comprobaciones para confirmar que los problemas se habían resuelto.

## 6. Resultados de las verificaciones

Al finalizar las revisiones, se obtuvieron los siguientes resultados:

| Comprobación | Resultado |
|---|---|
| Pruebas automatizadas | 50 pruebas superadas |
| Compilación del backend | Correcta |
| Compilación del frontend | Correcta |
| Importación CSV | 7 clientes, 8 contactos y 14 facturas creados |
| Control de incidencias CSV | 1 duplicado y 2 facturas rechazadas |
| Repetición de importación | Sin duplicación de datos |
| Instalación limpia con Docker | Correcta |
| Autenticación y protección de endpoints | Verificadas |
| Pruebas manuales de la interfaz | Realizadas |
| Credenciales en los archivos actuales del repositorio | No incluidas |

La interfaz no dispone de una batería propia de pruebas automatizadas de componentes, por lo que su funcionamiento visual se ha comprobado manualmente.

## 7. Conclusión

La inteligencia artificial ha sido una herramienta útil durante esta prueba técnica, especialmente para **agilizar la implementación, facilitar la generación de código, preparar pruebas y ayudar a localizar errores**.

Su utilización se ha combinado con la definición de requisitos, la supervisión de los resultados, la realización de pruebas y la solicitud de modificaciones cuando ha sido necesario.

Considero que el valor de estas herramientas no está únicamente en la cantidad de código que pueden generar, sino en saber utilizarlas de forma adecuada, comprender las soluciones propuestas y verificar que cumplen los requisitos.

El objetivo durante el desarrollo ha sido aprovechar esa capacidad de acelerar el trabajo sin dejar de lado la calidad, la validación y la comprensión del funcionamiento de la aplicación.

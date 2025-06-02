# Letragrama - Generador de Tableros de Palabras

Un generador interactivo de tableros de palabras tipo "letragrama" con una interfaz moderna y funcionalidades avanzadas.

## Características

- **Generación de Tableros**
  - Creación de tableros 6x8 con palabras interconectadas
  - Colocación automática de spangrama (palabra principal) y palabras clave
  - Relleno automático de espacios vacíos con letras aleatorias

- **Edición Manual**
  - Modo de edición con arrastrar y soltar (drag & drop)
  - Funcionalidades de deshacer/rehacer
  - Botón de reinicio para comenzar de nuevo

- **Guardado y Persistencia**
  - Guardado de tableros en formato JSON
  - Almacenamiento local de tableros generados
  - Historial de tableros con vista previa

- **Interfaz Moderna**
  - Diseño responsivo y adaptable
  - Animaciones y transiciones suaves
  - Mensajes de error y éxito con modales
  - Iconos intuitivos y tipografía moderna

## Cómo Usar

1. **Crear un Nuevo Tablero**
   - Ingresa el tema del juego
   - Añade tu nombre como autor
   - Escribe el spangrama (palabra principal)
   - Agrega las palabras clave (una por línea)
   - Haz clic en "Generar tablero"

2. **Edición Manual**
   - Haz clic en "Edición manual"
   - Arrastra y suelta las letras para reorganizarlas
   - Usa los botones de deshacer/rehacer para controlar los cambios
   - Haz clic en "Terminar edición" cuando finalices

3. **Guardar y Cargar**
   - Guarda el tablero haciendo clic en "Guardar tablero"
   - Los tableros se guardan automáticamente en el historial
   - Accede a tableros guardados desde el panel derecho

## Tecnologías Utilizadas

- HTML5 con semántica moderna
- CSS3 con variables personalizadas y diseño responsivo
- JavaScript vanilla para la lógica de la aplicación
- LocalStorage para persistencia de datos
- Google Fonts para tipografía
- Font Awesome para iconos

## Requisitos del Sistema

- Navegador web moderno con soporte para:
  - CSS Grid y Flexbox
  - CSS Custom Properties
  - LocalStorage
  - Drag and Drop API

## Desarrollo

El proyecto está estructurado en tres archivos principales:

- `letragrama.html`: Estructura y contenido
- `assets/css/letragrama.css`: Estilos y diseño responsivo
- `assets/js/letragrama.js`: Lógica de la aplicación

## Licencia

Este proyecto está disponible como código abierto bajo la Licencia MIT.

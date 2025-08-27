# Guía de Contribución

Este documento establece las pautas para contribuir al desarrollo del proyecto, incluyendo nuestra estrategia de ramas y la convención para los mensajes de commit.

---

## Estrategia de Ramas (GitFlow Simplificado)

Utilizamos un flujo de trabajo basado en **GitFlow** para mantener el repositorio organizado:

- **`main`**:  
  Rama que contiene el código de producción estable.  
  **Nadie debe hacer push directamente a `main`.**

- **`develop`**:  
  Rama principal de desarrollo.  
  Contiene la última versión del código con todas las nuevas funcionalidades integradas.  
  Todas las ramas de feature se crean a partir de `develop` y se vuelven a unir a ella.

- **`feature/CON-XX-nombre-descriptivo`**:  
  Cada nueva historia de usuario (**feature**) se desarrolla en su propia rama.

  - **Creación**:  
    Se crea a partir de la última versión de `develop`.
  - **Nombre**:  
    Debe incluir la clave de la tarea de Jira y un nombre corto que describa la funcionalidad.
  - **Finalización**:  
    Una vez terminada, se abre un Pull Request para unirla de nuevo a `develop`.

---

## Convención de Commits

Para mantener un historial claro y vincular nuestro trabajo con Jira, todos los mensajes de commit deben seguir este formato:

```
JIRA-KEY type(scope): subject
```

- **JIRA-KEY**: El identificador de la tarea de Jira (ej. `CON-35`).
- **type**: El tipo de cambio (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`).
- **scope**: _(Opcional)_ El módulo afectado (ej. `auth`, `db`).
- **subject**: Una descripción corta y en inglés del cambio.

#### Ejemplo

```bash
git commit -m "CON-65 feat(auth): implement user login service logic"
```

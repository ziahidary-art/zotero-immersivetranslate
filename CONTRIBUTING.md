# Contributing to Zotero BabelDOC

Thank you for your interest in contributing to the Zotero BabelDOC plugin! This document provides guidelines and instructions for contributing to this project.

## Development Setup

### Prerequisites

- Install a beta version of Zotero: https://www.zotero.org/support/beta_builds
- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [Git](https://git-scm.com/)

### Setting Up the Development Environment

1. Fork and clone the repository:

   ```
   git clone https://github.com/YOUR-USERNAME/zotero-babeldoc.git
   cd zotero-babeldoc
   ```

2. Copy the environment variable file. Modify the commands that starts your installation of the beta Zotero.

   > Create a development profile (Optional)
   > Start the beta Zotero with /path/to/zotero -p. Create a new profile and use it as your development profile. Do this only once.

   ```
    cp .env.example .env
    vim .env
   ```

   You may need to adjust the Zotero installation path in `package.json` if your Zotero is not installed in the default location.

3. Install dependencies with `pnpm install`.

4. Start development with auto-reload:
   ```
   pnpm start
   ```

## Building and Testing

- To build the plugin: `npm run build`

## Submitting Contributions

1. Create a new branch for your feature or bugfix:

   ```
   git checkout -b feature/your-feature-name
   ```

   or

   ```
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes, following the coding conventions below.

3. Test your changes thoroughly.

4. Commit your changes with clear, descriptive commit messages:

   ```
   git commit -m "feat: description of the feature"
   ```

5. Push your branch to your fork:

   ```
   git push origin feature/your-feature-name
   ```

6. Submit a pull request to the main repository.

## Code Style and Conventions

- Follow the existing code style and structure.
- Use descriptive variable and function names.
- Add comments for complex functionality.
- Keep functions small and focused on a single responsibility.
- Write clear commit messages describing what changes you made and why.

## Internationalization (i18n)

When adding or modifying user-facing text:

1. Add strings to the appropriate `.ftl` files in the `addon/locale` directory.
2. Make sure to add translations for all supported languages.
3. Use the appropriate IDs and structures as shown in existing files.

## Reporting Issues

- Use the [GitHub Issues](https://github.com/immersive-translate/zotero-immersivetranslate/issues) page to report bugs or suggest features.
- Before creating a new issue, please check if a similar issue already exists.
- Provide detailed information about the issue, including:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Screenshots if applicable
  - Your environment (Zotero version, OS, etc.)
  - If relevant, include the task ID when reporting translation issues

## Communication

- For general discussion and feedback, join the [BabelDOC community](https://immersivetranslate.com/zh-Hans/docs/communities/).
- For specific technical questions, you can open an issue on GitHub.

Thank you for contributing to make Zotero BabelDOC better!

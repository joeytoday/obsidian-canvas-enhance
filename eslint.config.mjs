import obsidianmd from "eslint-plugin-obsidianmd"

const recommended = obsidianmd.configs.recommended
const rules = Object.assign({}, ...recommended.map(config => config.rules ?? {}))
const jsonConfig = recommended.find(config => config.language === 'json/json')

export default [
  ...recommended,
  {
    ...jsonConfig,
    files: ['manifest.json'],
    rules: {
      ...jsonConfig.rules,
      'obsidianmd/validate-manifest': rules['obsidianmd/validate-manifest'],
    },
  },
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
]

import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../tailwind.config.js'

const fullConfig = resolveConfig(tailwindConfig)

export const brandColor = fullConfig.theme.colors.brand
export const breakpoints = fullConfig.theme.screens

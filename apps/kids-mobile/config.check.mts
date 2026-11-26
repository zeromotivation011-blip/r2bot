// Type-checks capacitor.config.ts against Capacitor's own CapacitorConfig.
// .mts on purpose: the repo-root tsconfig only includes *.ts / *.tsx, and the
// root CI never installs this folder's node_modules.
import type { CapacitorConfig } from '@capacitor/cli'
import config from './capacitor.config'

export const checked: CapacitorConfig = config

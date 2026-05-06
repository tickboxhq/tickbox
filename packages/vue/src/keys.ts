import type { ConsentStore } from '@tickboxhq/core'
import type { InjectionKey } from 'vue'

export const ConsentStoreKey: InjectionKey<ConsentStore> = Symbol('TickboxConsentStore')

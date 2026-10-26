import getConfig from 'next/config'
import { draftMode } from 'next/headers'

const { serverRuntimeConfig } = getConfig()

export async function isDraft() {
  const { isEnabled } = draftMode()
  return isEnabled && serverRuntimeConfig.allowDrafts
}

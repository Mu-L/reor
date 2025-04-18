export const isAppleOS = () =>
  /Mac/.test(navigator.platform) || (/AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent))

export function formatKeyboardShortcut(shortcut: string) {
  if (isAppleOS()) {
    return shortcut.replace('Mod', '⌘')
  }
  return shortcut.replace('Mod', 'Ctrl')
}

export function mergeCSSClasses(...classes: string[]) {
  return classes.filter((c) => c).join(' ')
}

export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${val}`)
  }
}

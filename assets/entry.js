// 总入口无外部请求，不写本地存档。安装态变化后立即隐藏引导。
const guide = document.querySelector('[data-install]')
const copy = document.querySelector('[data-install-copy]')
const button = document.querySelector('[data-install-button]')
const standalone = matchMedia('(display-mode: standalone)')
let installPrompt
let installedNow = false
function syncInstall() {
  const installed = installedNow || standalone.matches || navigator.standalone === true
  guide.hidden = installed
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  copy.textContent = ios ? '在 Safari 中打开，轻点「分享 → 添加到主屏幕」，再点「添加」。' : '在浏览器菜单中选择「添加到主屏幕」或「安装应用」。'
  button.hidden = installed || !installPrompt
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; syncInstall() })
window.addEventListener('appinstalled', () => { installedNow = true; installPrompt = undefined; syncInstall() })
standalone.addEventListener?.('change', syncInstall)
button.addEventListener('click', async () => {
  if (!installPrompt) return
  try {
    await installPrompt.prompt()
    await installPrompt.userChoice
  } catch {
    copy.textContent = '请打开浏览器菜单，选择「添加到主屏幕」或「安装应用」。'
  } finally {
    installPrompt = undefined
    button.hidden = true
  }
})
syncInstall()

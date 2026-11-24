const { packager } = require('@electron/packager');
const path = require('path');
(async () => {
  const out = await packager({
    dir: path.join(__dirname, '..', 'app'), out: path.join(__dirname, '..', 'dist'),
    name: 'Havoc City', executableName: 'Havoc City', platform: 'darwin', arch: ['arm64', 'x64'],
    electronVersion: '45.2.3', icon: path.join(__dirname, '..', 'icon', 'icon.icns'),
    appBundleId: 'com.havoccity.game', appVersion: '1.1.0', buildVersion: '2',
    appCategoryType: 'public.app-category.racing-games', darwinDarkModeSupport: true,
    asar: true, overwrite: true, prune: false
  });
  console.log(out.join('\n'));
})().catch(e => { console.error('PACK FAILED', e); process.exit(1); });

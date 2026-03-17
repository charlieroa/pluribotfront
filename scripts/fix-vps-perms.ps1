$ErrorActionPreference = 'Stop'

$projectRoot = '/var/www/pluribots'

$remoteScript = @'
set -e

chmod 755 /var/www/pluribots

find /var/www/pluribots/public /var/www/pluribots/src /var/www/pluribots/shared /var/www/pluribots/server/src /var/www/pluribots/dist -type d -exec chmod 755 {} +
find /var/www/pluribots/public /var/www/pluribots/src /var/www/pluribots/shared /var/www/pluribots/server/src /var/www/pluribots/dist -type f -exec chmod 644 {} +

chmod 755 /var/www/pluribots/server /var/www/pluribots/.deploy-backups /var/www/pluribots/dist-upload-temp 2>/dev/null || true
find /var/www/pluribots/.deploy-backups /var/www/pluribots/dist-upload-temp -type d -exec chmod 755 {} + 2>/dev/null || true
find /var/www/pluribots/.deploy-backups /var/www/pluribots/dist-upload-temp -type f -exec chmod 644 {} + 2>/dev/null || true

chmod 644 /var/www/pluribots/package.json /var/www/pluribots/package-lock.json /var/www/pluribots/index.html /var/www/pluribots/vite.config.ts /var/www/pluribots/tsconfig.json /var/www/pluribots/tsconfig.app.json /var/www/pluribots/tsconfig.node.json 2>/dev/null || true
chmod 644 /var/www/pluribots/server/package.json /var/www/pluribots/server/package-lock.json /var/www/pluribots/server/tsconfig.json /var/www/pluribots/server/PROD_READY.md 2>/dev/null || true

echo PERMS_FIXED
'@

ssh -F NUL -o BatchMode=yes -o StrictHostKeyChecking=no root@37.60.224.195 $remoteScript

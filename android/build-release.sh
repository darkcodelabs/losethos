#!/bin/sh
set -eu
cd "$(dirname "$0")"
: "${ANDROID_HOME:=$HOME/Android/Sdk}"
: "${GRADLE:=gradle}"
: "${LOSETHOS_SIGNING_DIR:=$HOME/.local/state/losethos/android}"
build_tools="$ANDROID_HOME/build-tools/36.0.0"
test -r "$LOSETHOS_SIGNING_DIR/release.jks"
test -r "$LOSETHOS_SIGNING_DIR/signing-password"
"$GRADLE" --no-daemon --console=plain assembleRelease
"$build_tools/zipalign" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk app/build/outputs/apk/release/aligned.apk
mkdir -p ../site/downloads ../site/.well-known
"$build_tools/apksigner" sign --ks "$LOSETHOS_SIGNING_DIR/release.jks" --ks-key-alias losethos --ks-pass "file:$LOSETHOS_SIGNING_DIR/signing-password" --out ../site/downloads/losethos-android.apk app/build/outputs/apk/release/aligned.apk
"$build_tools/apksigner" verify --print-certs ../site/downloads/losethos-android.apk > app/build/certificate.txt
python3 - <<'PY'
import json,re
from pathlib import Path
certificate=Path('app/build/certificate.txt').read_text()
hex_digest=re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-fA-F]+)',certificate).group(1).upper()
fingerprint=':'.join(hex_digest[i:i+2] for i in range(0,len(hex_digest),2))
Path('../site/.well-known/assetlinks.json').write_text(json.dumps([{'relation':['delegate_permission/common.handle_all_urls'],'target':{'namespace':'android_app','package_name':'org.darkcodelabs.losethos','sha256_cert_fingerprints':[fingerprint]}}],indent=2)+'\n')
print('Verified signed APK; matching Digital Asset Links generated.')
PY
(cd ../site/downloads && sha256sum losethos-android.apk > losethos-android.apk.sha256)

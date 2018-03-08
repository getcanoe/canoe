# Uploads existing builds for current version in package.json
# Also produces checksum file for all files uploaded.

VER=$(node -p -e "require('./package.json').version")
DESTINATION=website@getcanoe.io:/var/www/download/

cd build

# Android
cp ../platforms/android/build/outputs/apk/debug/android-debug.apk canoe-android-$VER-debug.apk

# Make sha1sum checksums
sha256sum canoe-*-$VER*.* > checksums-$VER.txt

# Upload all built files, signatures and checksums
scp canoe-*-$VER*.* $DESTINATION
scp checksums-$VER.txt $DESTINATION

cd ..

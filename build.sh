# Builds and uploads Canoe

DESTINATION=website@getcanoe.io:/var/www/files/


# Find version
VER=$(node -p -e "require('./package.json').version")

# Not release build by default
RELEASE=

# Pick out options
while test $# -gt 0
do
    case "$1" in
        --release)
	RELEASE=-release
	    ;;
        --help)
	echo "Usage: build.sh [--release]"
        exit 0
            ;;
        --*) echo "Bad option $1"
            ;;
        *) echo "Bad argument $1"
            ;;
    esac
    shift
done

echo "Building $VER ..."


cd build

# Remove previous build
rm -rf $VER
mkdir $VER

# Android is handled slightly different for release
if [[ "$RELEASE" == "-release" ]]
then
  # This builds Android and signs and everything to a proper apk.
  npm run final:android
  cp ../platforms/android/build/outputs/apk/release/android-release-signed-aligned.apk $VER/canoe-android-$VER.apk
else
  npm run build:android
  cp ../platforms/android/build/outputs/apk/debug/android-debug.apk $VER/canoe-android-$VER-debug.apk
fi

# This builds all three desktops in zip form
npm run build:desktop
# This signs all three desktops with GPG
npm run build:desktopsign


# Move files into $VER
mv canoe-*-$VER*.* $VER/

# Make sha256sum checksums
sha256sum $VER/canoe-*-$VER*.* > $VER/checksums.txt

# Upload all built files, signatures and checksums
scp -r $VER $DESTINATION

cd ..

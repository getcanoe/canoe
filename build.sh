# Builds and uploads Canoe

DESTINATION=website@getcanoe.io:/var/www/files/


# Find version
VER=$(node -p -e "require('./package.json').version")

# Put it into various places
sed -i -E "s/(X-Canoe-BuildId=)[.0-9]*(.*)/\1$VER\2/" resources/canoe/linux/canoe.desktop

# Defaults
RELEASE=
ANDROID=
DESKTOP=
UPLOAD=

# Pick out options
while test $# -gt 0
do
    case "$1" in
        --upload)
	UPLOAD=true
            ;;
        --release)
	RELEASE=true
	    ;;
        --desktop)
	DESKTOP=true
	    ;;
        --android)
	ANDROID=true
	    ;;
        --help)
	echo "Usage: build.sh [--release] [--desktop] [--android] [--upload]"
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

mkdir -p build
cd build

# Remove previous build
rm -rf $VER
mkdir $VER

# Android is handled slightly different for release
if [[ "$ANDROID" == "true" ]]
then
  if [[ "$RELEASE" == "true" ]]
  then
    # This builds Android and signs and everything to a proper apk.
    npm run final:android
    cp ../platforms/android/app/build/outputs/apk/release/app-release-signed-aligned.apk $VER/canoe-android-$VER.apk
  else
    # Debug build without proper signing
    npm run debug:android
    cp ../platforms/android/app/build/outputs/apk/debug/app-debug.apk $VER/canoe-android-$VER-debug.apk
  fi
fi

if [[ "$DESKTOP" == "true" ]]
then
  # This builds all three desktops in zip form, and Linux additionally as AppImage
  npm run build:desktop
  # This signs all three desktops with GPG, and Linux AppImage
  npm run build:desktopsign
fi

# Move files into $VER
mv -f canoe-*-$VER*.* $VER/

# Make sha256sum checksums
cd $VER
sha256sum canoe-*-$VER*.* > checksums.txt
cd ..

# Upload all built files, signatures and checksums
if [[ "$UPLOAD" == "true" ]]
then
  scp -r $VER $DESTINATION
fi

cd ..

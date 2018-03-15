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

# Android
if [[ "$RELEASE" == "-release" ]]
then
  npm run final:android
  cp ../platforms/android/build/outputs/apk/release/android-release-signed-aligned.apk $VER/canoe-android-$VER.apk
  npm run build:desktop
  npm run build:desktopsign
else
  npm run build:android
  cp ../platforms/android/build/outputs/apk/debug/android-debug.apk $VER/canoe-android-$VER-debug.apk
  npm run build:desktop
  npm run build:desktopsign
fi

# Move files into $VER
mv canoe-*-$VER*.* $VER/

# Make sha256sum checksums
sha256sum $VER/canoe-*-$VER*.* > $VER/checksums.txt

# Upload all built files, signatures and checksums
scp -r $VER $DESTINATION

cd ..

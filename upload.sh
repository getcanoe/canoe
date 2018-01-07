VER=0.1.0
DESTINATION=website@getcanoe.io:/var/www/html/download/

cd webkitbuilds/Canoe

# Android
cp ../../platforms/android/build/outputs/apk/release/android-release-signed-aligned.apk canoe-android-$VER.apk
scp canoe-android-$VER.apk $DESTINATION

# Linux
cp -a linux64 canoe-linux64-$VER
zip -r canoe-linux64-$VER.zip canoe-linux64-$VER
scp canoe-linux64-$VER.zip $DESTINATION

# OSX
cp -a osx64 canoe-osx64-$VER
zip -r canoe-osx64-$VER.zip canoe-osx64-$VER
scp canoe-osx64-$VER.zip $DESTINATION

# Win64
cp -a win64 canoe-win64-$VER
zip -r canoe-win64-$VER.zip canoe-win64-$VER
scp canoe-win64-$VER.zip $DESTINATION

# Remove work stuff
rm -rf canoe-*

cd ../..

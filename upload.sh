VER=$(node -p -e "require('./package.json').version")
DESTINATION=website@getcanoe.io:/var/www/download/

cd webkitbuilds/Canoe

# Android
cp ../../platforms/android/build/outputs/apk/debug/android-debug.apk canoe-android-$VER-debug.apk
scp canoe-android-$VER-debug.apk $DESTINATION

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

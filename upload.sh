VER=0.1.0

# Android
scp ./platforms/android/build/outputs/apk/release/android-release-signed-aligned.apk krampe.se:/home/gokr/www/canoe/canoe-android-$VER.apk

cd webkitbuilds/Canoe

# Linux
mv linux64 canoe-linux64-$VER
zip -r canoe-linux64-$VER.zip canoe-linux64-$VER
scp canoe-linux64-$VER.zip krampe.se:/home/gokr/www/canoe/

# OSX
mv osx64 canoe-osx64-$VER
zip -r canoe-osx64-$VER.zip canoe-osx64-$VER
scp canoe-osx64-$VER.zip krampe.se:/home/gokr/www/canoe/

# Win64
mv win64 canoe-win64-$VER
zip -r canoe-win64-$VER.zip canoe-win64-$VER
scp canoe-win64-$VER.zip krampe.se:/home/gokr/www/canoe/

cd ..

#!/bin/sh
# Just generates icons, see:
# https://stackoverflow.com/questions/5849396/hdpi-ldpi-mdpi-icon-menu-resolution
#---------------------------------------------------------------


echo " Creating different dimensions of logo ..."
logo=../logo/canoe-logo-light-blue.png

convert $logo -resize 192x192 canoe/android/icon/drawable-xxxhdpi-icon.png
convert $logo -resize 144x144 canoe/android/icon/drawable-xxhdpi-icon.png
convert $logo -resize 96x96 canoe/android/icon/drawable-xhdpi-icon.png
convert $logo -resize 72x72 canoe/android/icon/drawable-hdpi-icon.png
convert $logo -resize 48x48 canoe/android/icon/drawable-mdpi-icon.png
convert $logo -resize 36x36 canoe/android/icon/drawable-ldpi-icon.png
#        convert $1 -resize 67% drawable-xhdpi/$1
#        convert $1 -resize 50% drawable-hdpi/$1
#        convert $1 -resize 33% drawable-mdpi/$1
#        mv $1 drawable-xxhdpi/$1


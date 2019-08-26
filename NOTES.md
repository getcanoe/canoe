OSX:

sudo npm install -g grunt-cli
sudo npm install -g nw-gyp


To build new native modules for new NWJS:

grunt exec:powbuild

rm -rf native/osx64/node_modules/bindings
rm -rf native/osx64/node_modules/raiblocks-pow
cp -a node_modules/bindings native/osx64/node_modules/
cp -a node_modules/raiblocks-pow native/osx64/node_modules/


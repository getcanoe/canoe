[![Build Status](https://secure.travis-ci.org/gokr/raiw.svg)](http://travis-ci.org/gokr/raiw)

RaiW is a cross platform RaiBlocks Wallet application. It's based upon the [Copay](https://copay.io) Bitcoin wallet source code released under the MIT license. For binary downloads, see [raiw.krampe.se](https://raiw.krampe.se).

## Main Features

- Device-based security: all private keys are stored locally, not in the cloud
- Synchronous access across all major mobile and desktop platforms
- Support for over 150 currency pricing options and unit denomination in BTC or bits
- Email notifications for payments and transfers
- Push notifications (only available for ios and android versions)
- Customizable wallet naming and background colors
- Multiple languages supported

## Testing in a Browser

> **Note:** This method should only be used for development purposes. When running RaiW in a normal browser environment, browser extensions and other malicious code might have access to internal data and private keys. For production use, see the latest official [releases](https://github.com/gokr/raiw/releases/).

Clone the repo and open the directory:

```sh
git clone https://github.com/gokr/raiw.git
cd raiw
```

Ensure you have [Node](https://nodejs.org/) installed, then install and start Copay:

```sh
npm start
```

Visit [`localhost:8100`](http://localhost:8100/) to view the app.

A watch task is also available to rebuild components of the app as changes are made. This task can be run in a separate process – while the server started by `npm start` is running – to quickly test changes.

```
npm run watch
```

## Testing on Real Devices

It's recommended that all final testing be done on a real device – both to assess performance and to enable features that are unavailable to the emulator (e.g. a device camera).

### Android

Follow the [Cordova Android Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/) to set up your development environment.

When your developement enviroment is ready, run the `start:android` npm package script.

```sh
npm run start:android
```

### iOS

Follow the [Cordova iOS Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/) to set up your development environment.

When your developement enviroment is ready, run the `start:ios` npm package script.

```sh
npm run start:ios
```

### Windows Phone

Follow the [Cordova Windows Phone Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/win8/index.html) to set up your development environment.

When your developement enviroment is ready, follow this instructions:

- Go to app-template folder, search for config-template.xml and then remove this line:
```sh
<plugin name="cordova-plugin-qrscanner" spec="~2.5.0" />
```
and then enable this one:
```sh
<plugin name="phonegap-plugin-barcodescanner" spec="https://github.com/phonegap/phonegap-plugin-barcodescanner.git" />
```
- Run:
```sh
npm run clean-all
npm run start:windows
```
- Then open the project file with VS inside cordova/platform/windows/

### Desktop (Linux, macOS, and Windows)

The desktop version of Copay currently uses NW.js, an app runtime based on Chromium. To get started, first install NW.js on your system from [the NW.js website](https://nwjs.io/).

When NW.js is installed, run the `start:desktop` npm package script.

```sh
npm run start:desktop
```

## Build RaiW App Bundles

Before building the release version for a platform, run the `clean-all` command to delete any untracked files in your current working directory. (Be sure to stash any uncommited changes you've made.) This guarantees consistency across builds for the current state of this repository.

The `final` commands build the production version of the app, and bundle it with the release version of the platform being built.

### Android

```sh
npm run clean-all
npm run final:android
```

### iOS

```sh
npm run clean-all
npm run final:ios
```

### Windows Phone

- Install Visual Studio 2015 (or newer)
- Go to app-template folder, search for config-template.xml and then remove this line:
```sh
<plugin name="cordova-plugin-qrscanner" spec="~2.5.0" />
```
and then enable this one:
```sh
<plugin name="phonegap-plugin-barcodescanner" spec="https://github.com/phonegap/phonegap-plugin-barcodescanner.git" />
```
- Run:
```sh
npm run clean-all
npm run final:windows
```
- Then open the project file with VS inside cordova/platform/windows/

### Desktop (Linux, macOS, and Windows)

```sh
npm run clean-all
npm run final:desktop
```

### Google Chrome App

> cd chrome-app/

```sh
grunt
make
```

On success, the Chrome extension will be located at: `browser-extensions/chrome/raiw-chrome-extension`.  To install it go to `chrome://extensions/` in your browser and ensure you have the 'developer mode' option enabled in the settings.  Then click on "Load unpacked chrome extension" and choose the directory mentioned above.

## About RaiW
...details to come...

## Translations
RaiW uses standard gettext PO files for translations. We should as soon as RaiW is fully functional start using [Crowdin](https://crowdin.com) as the front-end tool for translators, just like Copay does, more on that follows later. In the meantime, credits to the partial translations RaiW has inherited from Copay:

**Translation Credits:**
- Japanese: @dabura667
- French: @kirvx
- Portuguese: @pmichelazzo
- Spanish: @cmgustavo
- German: @saschad
- Russian: @vadim0

*Gracias totales!*

## Version numbering
RaiW uses the `MAJOR.MINOR.BATCH` convention for versioning.  Any release that adds features should modify the MINOR or MAJOR number.

## Contributing to this project
Anyone and everyone is welcome to contribute.

## License
RaiW is released under the MIT License.  Please refer to the [LICENSE](https://github.com/gokr/raiw/blob/master/LICENSE) file that accompanies this project for more information including complete terms and conditions.

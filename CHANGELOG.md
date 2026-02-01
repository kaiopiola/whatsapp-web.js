# Changelog

All notable changes to this fork will be documented in this file.

This is a fork of [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) maintained by [@kaiopiola](https://github.com/kaiopiola).

## [2.0.0] - 2026-02-01

First stable release of this fork with critical bug fixes.

### Breaking Changes
- Package renamed to `@kaiopiola/whatsapp-web.js`
- Recommended to migrate from original package to this fork for stability improvements

### Fixed
- **Message Handling**: Fixed message triggers to properly process incoming messages
- **App State Synchronization**: Enhanced handling of app state changes to prevent sync issues
- **Recent Messages**: Improved message handling in Client class to properly process recent messages
- **Message Add Trigger**: Fixed message add trigger to work correctly with new messages
- **Logging**: Added detailed logging for message handling to help with debugging

### Changed
- Improved overall stability of message processing
- Enhanced error handling in Client class

## About This Fork

This fork was created to address critical bugs found in the original whatsapp-web.js library that were affecting production environments. The main focus is on stability and reliability improvements.

### Why This Fork?

The original project is excellent, but some critical bugs were affecting my production environment. After fixing these issues, I decided to publish this fork to help others who might be facing similar problems.

### Upstream

This fork tracks the original project at: https://github.com/pedroslopez/whatsapp-web.js

## Installation

```bash
# Via NPM
npm install @kaiopiola/whatsapp-web.js

# Via GitHub
npm install github:kaiopiola/whatsapp-web.js
```

## Contributing

If you find additional bugs or have improvements, feel free to open an issue or pull request at:
https://github.com/kaiopiola/whatsapp-web.js

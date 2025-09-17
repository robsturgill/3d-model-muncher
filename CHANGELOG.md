# [0.8.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.7.1...v0.8.0) (2025-09-17)


### Bug Fixes

* centralize license types with constant, update components, unknown values will display for edit ([a4a1a38](https://github.com/robsturgill/3d-model-muncher/commit/a4a1a38797ffeb5f87eff552d60352e7d250f192))
* restore remove tags from edited model in ModelDetailsDrawer ([2b05dc9](https://github.com/robsturgill/3d-model-muncher/commit/2b05dc9d8cb0c622ce5642678553913c0515a7a2))
* settings default filters now apply on reload, sets active filters in UI ([8d5b43d](https://github.com/robsturgill/3d-model-muncher/commit/8d5b43d61b518ff1dc74714c13d3f2385691891d))


### Features

* add designer field to model and update related components ([7d14bb7](https://github.com/robsturgill/3d-model-muncher/commit/7d14bb79fbb4d2111995daa0515e58467efc4d49))
* add dropdown for related files download in ModelCard component ([796f085](https://github.com/robsturgill/3d-model-muncher/commit/796f08542a10ca14616a41df91dc53d2c3e64eb9))
* can add related files to a model, validation and saving enhancements ([65f7af6](https://github.com/robsturgill/3d-model-muncher/commit/65f7af6f89e5a0323d36404b70c9c0c038d55751))

## [0.7.1](https://github.com/robsturgill/3d-model-muncher/compare/v0.7.0...v0.7.1) (2025-09-16)


### Bug Fixes

* added missing icons to filter sheet ([7f6e97f](https://github.com/robsturgill/3d-model-muncher/commit/7f6e97f113fbf4c0d4609509cdbfbde84a6bf94e))
* clarify processed item count display in settings page ([0bebd94](https://github.com/robsturgill/3d-model-muncher/commit/0bebd94b4d629b433bfca2877f4e7871eca1d0a9))
* correct uncategorized icon ([a9aea87](https://github.com/robsturgill/3d-model-muncher/commit/a9aea8768cac3452cde88e81893b57f471d46b6c))
* enhance debugging and sanitization of jsonFilePath in BulkEditDrawer ([29634a2](https://github.com/robsturgill/3d-model-muncher/commit/29634a2cf266635adf5f93c177f5dadc7023086f))
* enhance file integrity result handling and status display counts ([4afd439](https://github.com/robsturgill/3d-model-muncher/commit/4afd439d4f7aaf3ba8d2ed69c0aecaea4709c294))
* enhance logging by adding sanitization and truncating large outputs ([8f12a8f](https://github.com/robsturgill/3d-model-muncher/commit/8f12a8f48915f31586e384f92f7d5983a400da29))
* enhance model saving logic to handle corrupt files and normalize tags ([3450058](https://github.com/robsturgill/3d-model-muncher/commit/3450058c3812888930a51d7e2b9a8a2006754f9b))
* improve handling of file types in settings file integrity actions ([54a91f4](https://github.com/robsturgill/3d-model-muncher/commit/54a91f455c082f0c29cb75c56da25594355b2b10))
* positioning of print status in tag view models dialog ([89a494f](https://github.com/robsturgill/3d-model-muncher/commit/89a494f5b05504faa89607da90ee93567a8ec78d))
* prevent duplicate tags, increase tag display limit in filter sidebar ([67f40cf](https://github.com/robsturgill/3d-model-muncher/commit/67f40cf8092d0b371bf8f22d8ef52f6098173539))

# [0.7.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.6.0...v0.7.0) (2025-09-15)


### Bug Fixes

* fix for react-tree intrinsic type errors ([eb778e4](https://github.com/robsturgill/3d-model-muncher/commit/eb778e4b1f455550bbaebbd5908c64dc561a967b))
* **modelviewer3d:** removed max zoom level ([233d88f](https://github.com/robsturgill/3d-model-muncher/commit/233d88fb51a1eece3832b543dfc286a716d4cbd5))


### Features

* added category deletion, fix renaming issue, fix filtering issue ([bc4fa83](https://github.com/robsturgill/3d-model-muncher/commit/bc4fa83063a687bb0932d9b53cea2d9679395a03)), closes [#12](https://github.com/robsturgill/3d-model-muncher/issues/12)
* added file type filtering for model view ([6cb5fa7](https://github.com/robsturgill/3d-model-muncher/commit/6cb5fa760eb1a212d8b3605ff633b0eb45cacdfe))
* choose icon for category ([d50dd3a](https://github.com/robsturgill/3d-model-muncher/commit/d50dd3a11959b6107e17a731798322e6fdbc9f39))

# [0.6.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.5.2...v0.6.0) (2025-09-15)


### Features

* add shortcut to File Integrity view from Appbar ([a3b6254](https://github.com/robsturgill/3d-model-muncher/commit/a3b6254c2a9906f15783f2ea1ba9a0735f38a549)), closes [#11](https://github.com/robsturgill/3d-model-muncher/issues/11)
* added file scanning and generation actions to top toolbar ([c1968d5](https://github.com/robsturgill/3d-model-muncher/commit/c1968d570e4c54812d3269be56d7b1cf9d7d766d)), closes [#11](https://github.com/robsturgill/3d-model-muncher/issues/11)
* update ModelDetailsDrawer to add model path rearranged sections and display conditionals ([0735177](https://github.com/robsturgill/3d-model-muncher/commit/0735177534e33b7ecce2ef7deaace46e6c95e7bc))

## [0.5.2](https://github.com/robsturgill/3d-model-muncher/compare/v0.5.1...v0.5.2) (2025-09-14)


### Bug Fixes

* docker workflows to streamline build and push steps ([ef26a66](https://github.com/robsturgill/3d-model-muncher/commit/ef26a66396bdcae76cadc2f0f80a50f2e191631c))

## [0.5.1](https://github.com/robsturgill/3d-model-muncher/compare/v0.5.0...v0.5.1) (2025-09-14)


### Bug Fixes

* enhance and streamline image build process ([abfed43](https://github.com/robsturgill/3d-model-muncher/commit/abfed43c0308035a85543ba81b23402be08d36eb))
* update .gitignore for data dir and removed testing config ([139f26b](https://github.com/robsturgill/3d-model-muncher/commit/139f26bfe5909595fbad921a3b176da94ba4db50))

# [0.5.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.4.2...v0.5.0) (2025-09-14)


### Bug Fixes

* list view missing image with ImageWithFallback ([2ea47f6](https://github.com/robsturgill/3d-model-muncher/commit/2ea47f6928922bdbc3786774dc650e430146cb5f))


### Features

* can add categories and updated configuration management and UI preferences handling ([df658de](https://github.com/robsturgill/3d-model-muncher/commit/df658de1cc03a7f62f4583586a97eeae74209c46))

## [0.4.2](https://github.com/robsturgill/3d-model-muncher/compare/v0.4.1...v0.4.2) (2025-09-14)


### Bug Fixes

* placeholder image color toned down for dark theme ([3888588](https://github.com/robsturgill/3d-model-muncher/commit/388858896239f5cab6b8596d2d981e8d121086b0))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2025-09-14

### Fixed
- Fixed Docker build versioning issues with semantic-release dependencies
- Added missing @semantic-release/changelog and @semantic-release/git plugins
- Corrected package version dependencies for Docker production builds

## [0.4.0] - 2025-09-13

### Added
- Automated release and versioning system
- Conventional commit message support
- Automated changelog generation
- Enhanced Docker workflow with better tagging

## [0.3.0] - Previous Release

### Added
- STL filetype support
- Enhanced 3D model processing
- Improved web interface

## [0.2.0] - Previous Release

### Added
- Additional model format support
- Performance improvements

## [0.1.0] - Initial Release

### Added
- Initial release of 3D Model Muncher
- Support for 3MF file formats
- Web-based model viewer using Three.js
- Express.js backend server
- Docker containerization
- Unraid template support

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

# [0.13.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.12.2...v0.13.0) (2025-09-28)


### Bug Fixes

* change default 3d model color in settings and update related components ([49b676b](https://github.com/robsturgill/3d-model-muncher/commit/49b676b2e3670177ab1a76b457c2008b47801456)), closes [#29](https://github.com/robsturgill/3d-model-muncher/issues/29)
* enhance image generation handling and UI feedback in BulkEditDrawer ([b076b84](https://github.com/robsturgill/3d-model-muncher/commit/b076b849065d6725a2396cba7ad68721a731d3a6))
* improve duplicate file removal dialog layout with overflow handling ([61c5790](https://github.com/robsturgill/3d-model-muncher/commit/61c5790ac6be90287b35beb187783f88567c3a14)), closes [#39](https://github.com/robsturgill/3d-model-muncher/issues/39)
* remove duplicate group in UI after selecting a file to keep, without having to rescan ([c37657f](https://github.com/robsturgill/3d-model-muncher/commit/c37657f6e9ab79f25ff10e8301640962e0ec2fcf)), closes [#40](https://github.com/robsturgill/3d-model-muncher/issues/40)
* update license display strings to use standardized abbreviations found across models ([599bdb9](https://github.com/robsturgill/3d-model-muncher/commit/599bdb9df7a4619ef5b26bcfe4d1ae47b01e647a)), closes [#34](https://github.com/robsturgill/3d-model-muncher/issues/34)


### Features

* bulk create thumbnails for models with no images, simpler logging, verbose switch in settings ([b8fe4fd](https://github.com/robsturgill/3d-model-muncher/commit/b8fe4fdece83b2469fcd50a6aea8394465fc1fe8)), closes [#30](https://github.com/robsturgill/3d-model-muncher/issues/30)

## [0.12.2](https://github.com/robsturgill/3d-model-muncher/compare/v0.12.1...v0.12.2) (2025-09-27)


### Bug Fixes

* add clear to filter search, ctrl k to focus, escape to clear ([403b3d5](https://github.com/robsturgill/3d-model-muncher/commit/403b3d576abeb7c33bb18af35c87df7fdefb2d80)), closes [#33](https://github.com/robsturgill/3d-model-muncher/issues/33)
* always render footer in ModelCard to maintain layout stability during selection mode ([eae96d5](https://github.com/robsturgill/3d-model-muncher/commit/eae96d523fa620ca5d97514936a3fce5a3501f29)), closes [#31](https://github.com/robsturgill/3d-model-muncher/issues/31)
* enhance model directory handling in settings to load from other paths w/o server restart ([abf5552](https://github.com/robsturgill/3d-model-muncher/commit/abf5552023444608b3d5bfcb46dcc250936b9a35))
* improve file & path text overflow display, truncation, scrolling in model detail drawer ([d640c5d](https://github.com/robsturgill/3d-model-muncher/commit/d640c5d90863231dc9a959e0fa55161037bc64c6))
* prevent double-submit on save and update button state during saving ([2086e78](https://github.com/robsturgill/3d-model-muncher/commit/2086e78ce8cbe722cd97ef497c1301825be9807e)), closes [#27](https://github.com/robsturgill/3d-model-muncher/issues/27)
* reduce gap in Card componen ([71e9cde](https://github.com/robsturgill/3d-model-muncher/commit/71e9cdef04f46a18d561d454298b53236d1b6d1e))
* restoring description, handle clearing user-defined description in model save process ([de6c923](https://github.com/robsturgill/3d-model-muncher/commit/de6c9237cbe9590f48d6a5ebbf97b51ee45f734d)), closes [#35](https://github.com/robsturgill/3d-model-muncher/issues/35)
* update bulk edit save buttons to show loading spinner ([11b72c3](https://github.com/robsturgill/3d-model-muncher/commit/11b72c3ceba200ce48ac562bbb3260b64a3c7076))
* use scrollarea to remove native scrollbars in settings tag listing and dialog ([0da6810](https://github.com/robsturgill/3d-model-muncher/commit/0da6810b4c20fbaefede2255475aa634acd6c72a)), closes [#32](https://github.com/robsturgill/3d-model-muncher/issues/32)

## [0.12.1](https://github.com/robsturgill/3d-model-muncher/compare/v0.12.0...v0.12.1) (2025-09-26)


### Bug Fixes

* updated release notes dialog ([ce1f8cb](https://github.com/robsturgill/3d-model-muncher/commit/ce1f8cbc195affc484314c16b440c391d6992de7))

# [0.12.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.11.0...v0.12.0) (2025-09-26)


### Bug Fixes

* adjust spacing in FilterSidebar component for new sort by field ([6e93140](https://github.com/robsturgill/3d-model-muncher/commit/6e9314051ab04eefdd6c373c06955fe0227f8439))


### Features

* add created and lastModified timestamps to model metadata ([2ba5af1](https://github.com/robsturgill/3d-model-muncher/commit/2ba5af1e32d1020e6ae7dd3164de559dee9d2393))
* add model upload functionality with folder management ([253f5d3](https://github.com/robsturgill/3d-model-muncher/commit/253f5d3d5b034e8d425d44fec2948d6cbeb494a3))
* add sorting functionality to model filters ([e720c0e](https://github.com/robsturgill/3d-model-muncher/commit/e720c0e13310f9de741222e58c1dbb07c529c66b))

# [0.11.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.10.1...v0.11.0) (2025-09-25)


### Bug Fixes

* better styling management, increased default font-size ([18bb21f](https://github.com/robsturgill/3d-model-muncher/commit/18bb21fa642cc46e7e47829b20d95ff5553e9570))
* bulk edit related files with same names but different filetypes ([ede76fb](https://github.com/robsturgill/3d-model-muncher/commit/ede76fb3f248aad36d6e3d4726143a0553947387))
* improve styling and layout in various components ([b083552](https://github.com/robsturgill/3d-model-muncher/commit/b083552d43854586f00538011be305ebe8050082))
* integrate legacy image migration into scan endpoint, removed migration button from settings ([cfc80d1](https://github.com/robsturgill/3d-model-muncher/commit/cfc80d1d166b270ad14bd6d219b8b039745be654))
* positioned download button to bottom of model card for consistency ([307bb30](https://github.com/robsturgill/3d-model-muncher/commit/307bb30d7d027d1efa0a7ba468ba4cbe7a48d25f))


### Features

* added bulk editing related files, can now link other models together ([1dd0bb3](https://github.com/robsturgill/3d-model-muncher/commit/1dd0bb367713c17cb2dfb50b47f72434025acfb3))

## [0.10.1](https://github.com/robsturgill/3d-model-muncher/compare/v0.10.0...v0.10.1) (2025-09-24)


### Bug Fixes

* add configurable model card fields and printed badge visibility ([b9ab6cf](https://github.com/robsturgill/3d-model-muncher/commit/b9ab6cfab385ef1b445bb7fc09ee9e94afa87b1d)), closes [#15](https://github.com/robsturgill/3d-model-muncher/issues/15)

# [0.10.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.9.0...v0.10.0) (2025-09-24)


### Bug Fixes

* loading indicators for refresh and initalizing large libraries ([51d71c3](https://github.com/robsturgill/3d-model-muncher/commit/51d71c36fa7f93252d38f539e76ac22596de7ec3)), closes [#20](https://github.com/robsturgill/3d-model-muncher/issues/20)
* toast secondary text color, fix drawer width on smaller screens exceeding container ([3d07acc](https://github.com/robsturgill/3d-model-muncher/commit/3d07acced08196eadb47e4889a59effcafc3e95d)), closes [#21](https://github.com/robsturgill/3d-model-muncher/issues/21)


### Features

* add image capture functionality to ModelViewer3D and saving to model images ([3b1c79c](https://github.com/robsturgill/3d-model-muncher/commit/3b1c79c2d71eb584f438ff276f436e1063a8123c))

# [0.9.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.8.0...v0.9.0) (2025-09-23)


### Bug Fixes

* changed alert styling in bulkEditDrawer, image size issue in settings support ([2f392ce](https://github.com/robsturgill/3d-model-muncher/commit/2f392ce87013d9045746d379e6633d2bb1a385a6))
* cleanup how ai generated content replaces field content when saving ([63fc591](https://github.com/robsturgill/3d-model-muncher/commit/63fc591d3bd1e8366175aaf98615efd2940b7ad2))
* enforce model directory containment for saved files ([997ba0f](https://github.com/robsturgill/3d-model-muncher/commit/997ba0fa108e497a341bb36724776811c8f3fa0f))
* enhance ai-gen experiment saving by updating top-level category and tags ([f35d536](https://github.com/robsturgill/3d-model-muncher/commit/f35d536bd0c07f6625cf5d07c6202d7b52b0c0d1))
* enhance model loading and saving by implementing id-based lookups ([ffac84c](https://github.com/robsturgill/3d-model-muncher/commit/ffac84cc4ac0b37e6f25ec8e4c8e9fe9dc47c082))
* enhance munchie JSON processing so  userDefined thumbnail and imageOrder are set correctly ([cf36689](https://github.com/robsturgill/3d-model-muncher/commit/cf36689f6718c35231c0d9e784fbeadd90507ab6))
* error reporting if no google api key is present, updated readme for adding api key ([6613e85](https://github.com/robsturgill/3d-model-muncher/commit/6613e8545c649a63c9ec568c71ec504810a64699))
* **experimental:** drawer layout and styling, category options, ai error messaging ([7322962](https://github.com/robsturgill/3d-model-muncher/commit/7322962e4e4543d813f486498df70ae2040cd107))
* **experimental:** user prompt issue, select other from templates to display field for input ([1f0861e](https://github.com/robsturgill/3d-model-muncher/commit/1f0861ec38278598de5a2135ad8a70e36bd82fe3))
* image gallery exceeding browser window when fullscreen ([01ebfb0](https://github.com/robsturgill/3d-model-muncher/commit/01ebfb0f8c250d61adac4a6631213630c4fb00af))
* improve image persistance for user added images and image ordering ([52f708b](https://github.com/robsturgill/3d-model-muncher/commit/52f708b96a4b57214e5301ec079af9c7a0cf5505))
* persist user added images, order and refactored how parsed images are separate from user images ([e843316](https://github.com/robsturgill/3d-model-muncher/commit/e8433161c6d4c74cdeaeba9d6c915d30ce2e8de1))
* persist user images with regeneration, improve image ordering method ([066b240](https://github.com/robsturgill/3d-model-muncher/commit/066b240bf488b1cbdbe7319110391fb6a2e6ade5))
* preserve user description and related files when regenerating json ([a6c8124](https://github.com/robsturgill/3d-model-muncher/commit/a6c8124a79def9432de459316318a674c25fd375))
* refactor userDefined structure in model-related components ([edb63dc](https://github.com/robsturgill/3d-model-muncher/commit/edb63dc63ca3347d51ca45339325fbbe2beafb64))
* switched to use userDefined description for generative ai ([442d74c](https://github.com/robsturgill/3d-model-muncher/commit/442d74c4b9836565a75638429d37261e8f407d1e))
* thumbnail image not displaying in settings, other styling updates ([efbcef0](https://github.com/robsturgill/3d-model-muncher/commit/efbcef07e2fa3e3133bf2ae6ab102334415233c9))


### Features

* add migration endpoint for legacy images and implement release notes dialog ([eca6972](https://github.com/robsturgill/3d-model-muncher/commit/eca6972093b8cdf9b71a042dfa7060debfcc44cf))
* add options to include image and model name in AI prompts ([d647121](https://github.com/robsturgill/3d-model-muncher/commit/d64712165d88ba3a6d83357ac36b915971505393))
* added experimental AI workflow to suggest metadata for description, category, and tags ([0fa647f](https://github.com/robsturgill/3d-model-muncher/commit/0fa647f8c89ee4c82516ba8293f5938ca0fa92cb))
* allow restoring of descriptions to original, user changes are stored separately ([0907694](https://github.com/robsturgill/3d-model-muncher/commit/090769476b52e1e81b38677490d64d5d0c3fad3b))
* **experimentaltab:** add experimental tab with lazy loading for settings page ([fefcf0c](https://github.com/robsturgill/3d-model-muncher/commit/fefcf0ca57e0898745a0597a59cd9e28d9cf1397))
* **settings:** add unmapped categories feature to display and add categories from model metadata ([6ce5c89](https://github.com/robsturgill/3d-model-muncher/commit/6ce5c89c226f75742a0e00a8b9035e3ac30065ea))

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

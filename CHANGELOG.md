# 1.0.0 (2025-12-11)


### Bug Fixes

* add 'Show Missing Images' filter option in FilterSidebar and update related state management ([7fa3a7d](https://github.com/CNCmarlin/3d-model-muncher/commit/7fa3a7db6d14453355bf089d569fad37161f48f9)), closes [#52](https://github.com/CNCmarlin/3d-model-muncher/issues/52)
* add clear to filter search, ctrl k to focus, escape to clear ([403b3d5](https://github.com/CNCmarlin/3d-model-muncher/commit/403b3d576abeb7c33bb18af35c87df7fdefb2d80)), closes [#33](https://github.com/CNCmarlin/3d-model-muncher/issues/33)
* add configurable model card fields and printed badge visibility ([b9ab6cf](https://github.com/CNCmarlin/3d-model-muncher/commit/b9ab6cfab385ef1b445bb7fc09ee9e94afa87b1d)), closes [#15](https://github.com/CNCmarlin/3d-model-muncher/issues/15)
* add dist-backend/ to .gitignore to prevent unnecessary files from being tracked ([4fc40d0](https://github.com/CNCmarlin/3d-model-muncher/commit/4fc40d0ce937a763340002a163926af083658b83))
* add preview generation for uploaded models, increase file upload size limit to 1GB ([c13d713](https://github.com/CNCmarlin/3d-model-muncher/commit/c13d713c53f8caeba9ea01dc55b0417286e12d51)), closes [#28](https://github.com/CNCmarlin/3d-model-muncher/issues/28)
* add removal functionality for selected models in collection editing ([b164884](https://github.com/CNCmarlin/3d-model-muncher/commit/b16488489f7270696c93cb6a8923835d4fe9b711))
* add sort by option in settings and update related state management in filters ([32e01c2](https://github.com/CNCmarlin/3d-model-muncher/commit/32e01c2428b1dc015b84fab9bc2b698439fa7c28))
* added missing icons to filter sheet ([7f6e97f](https://github.com/CNCmarlin/3d-model-muncher/commit/7f6e97f113fbf4c0d4609509cdbfbde84a6bf94e))
* additional hardening, prevent accidental overwrites of model files by remapping to munchie JSON ([7c2c761](https://github.com/CNCmarlin/3d-model-muncher/commit/7c2c761d602a7aee2e52ca10a58968460a9c6e42))
* adjust spacing in FilterSidebar component for new sort by field ([6e93140](https://github.com/CNCmarlin/3d-model-muncher/commit/6e9314051ab04eefdd6c373c06955fe0227f8439))
* **align semantic-release and docker workflows:** align semantic-release and docker workflows ([1e8f322](https://github.com/CNCmarlin/3d-model-muncher/commit/1e8f32246143c0bc2bfb606e4d69effccce9ea10))
* always render footer in ModelCard to maintain layout stability during selection mode ([eae96d5](https://github.com/CNCmarlin/3d-model-muncher/commit/eae96d523fa620ca5d97514936a3fce5a3501f29)), closes [#31](https://github.com/CNCmarlin/3d-model-muncher/issues/31)
* better styling management, increased default font-size ([18bb21f](https://github.com/CNCmarlin/3d-model-muncher/commit/18bb21fa642cc46e7e47829b20d95ff5553e9570))
* build changes ([4ea301d](https://github.com/CNCmarlin/3d-model-muncher/commit/4ea301da3d286dea3d432894a04ec99ed48a065c))
* build versioning issue ([d24b3ba](https://github.com/CNCmarlin/3d-model-muncher/commit/d24b3bae4e089320323247c2aae70837131bf6b4))
* bulk deletion to include .stl files alongside .3mf and update related UI messages ([d38cff0](https://github.com/CNCmarlin/3d-model-muncher/commit/d38cff05b3f3475c8f1937f792ecd3aae45092fb))
* bulk edit related files with same names but different filetypes ([ede76fb](https://github.com/CNCmarlin/3d-model-muncher/commit/ede76fb3f248aad36d6e3d4726143a0553947387))
* category list disappearing from bulk edit drawer ([ad89604](https://github.com/CNCmarlin/3d-model-muncher/commit/ad89604e83ca099bdace03190f164876b0263d23))
* centralize license types with constant, update components, unknown values will display for edit ([a4a1a38](https://github.com/CNCmarlin/3d-model-muncher/commit/a4a1a38797ffeb5f87eff552d60352e7d250f192))
* change default 3d model color in settings and update related components ([49b676b](https://github.com/CNCmarlin/3d-model-muncher/commit/49b676b2e3670177ab1a76b457c2008b47801456)), closes [#29](https://github.com/CNCmarlin/3d-model-muncher/issues/29)
* changed alert styling in bulkEditDrawer, image size issue in settings support ([2f392ce](https://github.com/CNCmarlin/3d-model-muncher/commit/2f392ce87013d9045746d379e6633d2bb1a385a6))
* clarify processed item count display in settings page ([0bebd94](https://github.com/CNCmarlin/3d-model-muncher/commit/0bebd94b4d629b433bfca2877f4e7871eca1d0a9))
* cleanup how ai generated content replaces field content when saving ([63fc591](https://github.com/CNCmarlin/3d-model-muncher/commit/63fc591d3bd1e8366175aaf98615efd2940b7ad2))
* collections in the main grid now respect the active search, category, and tag filters ([a4e2709](https://github.com/CNCmarlin/3d-model-muncher/commit/a4e2709298bb4a50cb86e14576858b1a2987064c)), closes [#54](https://github.com/CNCmarlin/3d-model-muncher/issues/54)
* correct uncategorized icon ([a9aea87](https://github.com/CNCmarlin/3d-model-muncher/commit/a9aea8768cac3452cde88e81893b57f471d46b6c))
* default category to 'Uncategorized' in CollectionEditDrawer ([dd68423](https://github.com/CNCmarlin/3d-model-muncher/commit/dd68423f5e68ee7e4ad370a4516547a509e7781b))
* disable generate image button when other bulk edits are attempted, styling updates to drawer ([2d7d7c7](https://github.com/CNCmarlin/3d-model-muncher/commit/2d7d7c765aeb4e394ea39b67b101dfe181699158))
* docker tag fix ([c39b127](https://github.com/CNCmarlin/3d-model-muncher/commit/c39b12729309031bd0980b92cf6b4efa62dc9b5b))
* docker workflows to streamline build and push steps ([ef26a66](https://github.com/CNCmarlin/3d-model-muncher/commit/ef26a66396bdcae76cadc2f0f80a50f2e191631c))
* download functionality by preserving subdirectory structure and improving filename handling ([3b713a3](https://github.com/CNCmarlin/3d-model-muncher/commit/3b713a3a3342ffd009c85415f1256d4765894161))
* drawer handling to close when clicked outside but prevent accidental close when editing ([77ba9eb](https://github.com/CNCmarlin/3d-model-muncher/commit/77ba9ebf1ed9145b4b4031981fb688019ba595b8))
* enforce model directory containment for saved files ([997ba0f](https://github.com/CNCmarlin/3d-model-muncher/commit/997ba0fa108e497a341bb36724776811c8f3fa0f))
* enhance ai-gen experiment saving by updating top-level category and tags ([f35d536](https://github.com/CNCmarlin/3d-model-muncher/commit/f35d536bd0c07f6625cf5d07c6202d7b52b0c0d1))
* enhance and streamline image build process ([abfed43](https://github.com/CNCmarlin/3d-model-muncher/commit/abfed43c0308035a85543ba81b23402be08d36eb))
* enhance collection editing with mode toggle, select new or from existing collection ([8dae0cb](https://github.com/CNCmarlin/3d-model-muncher/commit/8dae0cbb8851f60c1eec7e48099f0792061e7da2)), closes [#50](https://github.com/CNCmarlin/3d-model-muncher/issues/50)
* enhance debugging and sanitization of jsonFilePath in BulkEditDrawer ([29634a2](https://github.com/CNCmarlin/3d-model-muncher/commit/29634a2cf266635adf5f93c177f5dadc7023086f))
* enhance drawer to limit closing when editing ([666fd95](https://github.com/CNCmarlin/3d-model-muncher/commit/666fd95b8e71888bc8af0f0dfcfa6f5c492bfd5e))
* enhance file integrity result handling and status display counts ([4afd439](https://github.com/CNCmarlin/3d-model-muncher/commit/4afd439d4f7aaf3ba8d2ed69c0aecaea4709c294))
* enhance G-code support with improved extraction and file preservation ([48b054a](https://github.com/CNCmarlin/3d-model-muncher/commit/48b054acbc10edb20de506efe7dd364152a6f4fd))
* enhance G-code tests, handling with path validation and update README for clarity ([1c14df9](https://github.com/CNCmarlin/3d-model-muncher/commit/1c14df9d01cac3048809e97252eb85d575417d47))
* enhance image generation handling and UI feedback in BulkEditDrawer ([b076b84](https://github.com/CNCmarlin/3d-model-muncher/commit/b076b849065d6725a2396cba7ad68721a731d3a6))
* enhance logging by adding sanitization and truncating large outputs ([8f12a8f](https://github.com/CNCmarlin/3d-model-muncher/commit/8f12a8f48915f31586e384f92f7d5983a400da29))
* enhance model directory handling in settings to load from other paths w/o server restart ([abf5552](https://github.com/CNCmarlin/3d-model-muncher/commit/abf5552023444608b3d5bfcb46dcc250936b9a35))
* enhance model loading and saving by implementing id-based lookups ([ffac84c](https://github.com/CNCmarlin/3d-model-muncher/commit/ffac84cc4ac0b37e6f25ec8e4c8e9fe9dc47c082))
* enhance model saving logic to handle corrupt files and normalize tags ([3450058](https://github.com/CNCmarlin/3d-model-muncher/commit/3450058c3812888930a51d7e2b9a8a2006754f9b))
* enhance model selection with shift-click range support and update event handling ([c0d87d5](https://github.com/CNCmarlin/3d-model-muncher/commit/c0d87d5d327ac5e4a9c6339ab0a8ded71135d173)), closes [#45](https://github.com/CNCmarlin/3d-model-muncher/issues/45)
* enhance munchie JSON processing so  userDefined thumbnail and imageOrder are set correctly ([cf36689](https://github.com/CNCmarlin/3d-model-muncher/commit/cf36689f6718c35231c0d9e784fbeadd90507ab6))
* ensure boolean values are correctly set for checkbox and switch components ([50deb8e](https://github.com/CNCmarlin/3d-model-muncher/commit/50deb8ed6cc6919abe4f40b85970a6cdce7b9fac))
* error reporting if no google api key is present, updated readme for adding api key ([6613e85](https://github.com/CNCmarlin/3d-model-muncher/commit/6613e8545c649a63c9ec568c71ec504810a64699))
* **experimental:** drawer layout and styling, category options, ai error messaging ([7322962](https://github.com/CNCmarlin/3d-model-muncher/commit/7322962e4e4543d813f486498df70ae2040cd107))
* **experimental:** user prompt issue, select other from templates to display field for input ([1f0861e](https://github.com/CNCmarlin/3d-model-muncher/commit/1f0861ec38278598de5a2135ad8a70e36bd82fe3))
* file type filter to control collection visibility in model views ([e85c39e](https://github.com/CNCmarlin/3d-model-muncher/commit/e85c39e2af5c2ea0d6dc3deb46058b1a651b2e73))
* fix for react-tree intrinsic type errors ([eb778e4](https://github.com/CNCmarlin/3d-model-muncher/commit/eb778e4b1f455550bbaebbd5908c64dc561a967b))
* format devDependencies in package.json ([9d0f6b2](https://github.com/CNCmarlin/3d-model-muncher/commit/9d0f6b22318369aef618757520171c12a7e1103f))
* g-code enhancement for storing file with model not just processing ([4243aac](https://github.com/CNCmarlin/3d-model-muncher/commit/4243aac0ec9e30f7efe83756714802ae2043a2c7))
* handling related files view button when uploading gcode file types ([6bd80e8](https://github.com/CNCmarlin/3d-model-muncher/commit/6bd80e85e6efe1fdd502323a43b6e669c51173e0))
* image gallery exceeding browser window when fullscreen ([01ebfb0](https://github.com/CNCmarlin/3d-model-muncher/commit/01ebfb0f8c250d61adac4a6631213630c4fb00af))
* implement add/remove model from collection functionality and update hidden model handling ([774cada](https://github.com/CNCmarlin/3d-model-muncher/commit/774cada1e49b78e7c211c181a9b27bc03ad5cd5c))
* implement category selection navigation from settings to models view ([2358b1b](https://github.com/CNCmarlin/3d-model-muncher/commit/2358b1b5e9109f3bef73457cbaf348382e0bf688))
* implement G-code archive filtering in upload and scan processes ([156e689](https://github.com/CNCmarlin/3d-model-muncher/commit/156e6894a1f070010c92dd8c2233cf1651dd1709))
* implement selection controls in collection view, refactored select mode to reusable component ([0ab7e70](https://github.com/CNCmarlin/3d-model-muncher/commit/0ab7e70444782d59c2f8d680a05737db4f6f5e45)), closes [#51](https://github.com/CNCmarlin/3d-model-muncher/issues/51)
* implement worker-specific config handling to avoid clobbering main config during tests ([8fdd5ae](https://github.com/CNCmarlin/3d-model-muncher/commit/8fdd5ae22d354039885032c936c4caf38756c72c))
* improve collection display for list view, added missing actions button for collection ([e818b6a](https://github.com/CNCmarlin/3d-model-muncher/commit/e818b6a8fb2f1087f11c809fee38242d92cedb8b))
* improve dropdown behavior for tag input field, only display after initial character input ([ebe902d](https://github.com/CNCmarlin/3d-model-muncher/commit/ebe902d5bfd39ef2c51cf8b86f0b97aacdd90233))
* improve duplicate file removal dialog layout with overflow handling ([61c5790](https://github.com/CNCmarlin/3d-model-muncher/commit/61c5790ac6be90287b35beb187783f88567c3a14)), closes [#39](https://github.com/CNCmarlin/3d-model-muncher/issues/39)
* improve file & path text overflow display, truncation, scrolling in model detail drawer ([d640c5d](https://github.com/CNCmarlin/3d-model-muncher/commit/d640c5d90863231dc9a959e0fa55161037bc64c6))
* improve handling of file types in settings file integrity actions ([54a91f4](https://github.com/CNCmarlin/3d-model-muncher/commit/54a91f455c082f0c29cb75c56da25594355b2b10))
* improve image persistance for user added images and image ordering ([52f708b](https://github.com/CNCmarlin/3d-model-muncher/commit/52f708b96a4b57214e5301ec079af9c7a0cf5505))
* improve mobile layout for the settings page ([bb8cea6](https://github.com/CNCmarlin/3d-model-muncher/commit/bb8cea68ce0cc18efcbae94585de9cf2ff681143))
* improve styling and layout in various components ([b083552](https://github.com/CNCmarlin/3d-model-muncher/commit/b083552d43854586f00538011be305ebe8050082))
* integrate legacy image migration into scan endpoint, removed migration button from settings ([cfc80d1](https://github.com/CNCmarlin/3d-model-muncher/commit/cfc80d1d166b270ad14bd6d219b8b039745be654))
* issue during image fullscreen escape key closing detail drawer ([cd3376b](https://github.com/CNCmarlin/3d-model-muncher/commit/cd3376bb01a3334d9c1da546f2a53b8b52b75b37))
* issue with hidden model filter when exiting collection view ([2c7c9be](https://github.com/CNCmarlin/3d-model-muncher/commit/2c7c9be0ccb0960b29480a70ab1c89e4593b9102))
* list view missing image with ImageWithFallback ([2ea47f6](https://github.com/CNCmarlin/3d-model-muncher/commit/2ea47f6928922bdbc3786774dc650e430146cb5f))
* loading indicators for refresh and initalizing large libraries ([51d71c3](https://github.com/CNCmarlin/3d-model-muncher/commit/51d71c36fa7f93252d38f539e76ac22596de7ec3)), closes [#20](https://github.com/CNCmarlin/3d-model-muncher/issues/20)
* **modelviewer3d:** removed max zoom level ([233d88f](https://github.com/CNCmarlin/3d-model-muncher/commit/233d88fb51a1eece3832b543dfc286a716d4cbd5))
* normalize category selection saved value across edit modes ([60eb2b5](https://github.com/CNCmarlin/3d-model-muncher/commit/60eb2b57bbb6bc6b6a8aa99e38fadda25aa289d8)), closes [#53](https://github.com/CNCmarlin/3d-model-muncher/issues/53)
* persist STL print setting changes when regenerating munchie.json ([5f2f48b](https://github.com/CNCmarlin/3d-model-muncher/commit/5f2f48be6627411dc75f7fe31d211d2af7a8d5e7))
* persist user added images, order and refactored how parsed images are separate from user images ([e843316](https://github.com/CNCmarlin/3d-model-muncher/commit/e8433161c6d4c74cdeaeba9d6c915d30ce2e8de1))
* persist user images with regeneration, improve image ordering method ([066b240](https://github.com/CNCmarlin/3d-model-muncher/commit/066b240bf488b1cbdbe7319110391fb6a2e6ade5))
* placeholder image color toned down for dark theme ([3888588](https://github.com/CNCmarlin/3d-model-muncher/commit/388858896239f5cab6b8596d2d981e8d121086b0))
* positioned download button to bottom of model card for consistency ([307bb30](https://github.com/CNCmarlin/3d-model-muncher/commit/307bb30d7d027d1efa0a7ba468ba4cbe7a48d25f))
* positioning of print status in tag view models dialog ([89a494f](https://github.com/CNCmarlin/3d-model-muncher/commit/89a494f5b05504faa89607da90ee93567a8ec78d))
* preserve user description and related files when regenerating json ([a6c8124](https://github.com/CNCmarlin/3d-model-muncher/commit/a6c8124a79def9432de459316318a674c25fd375))
* prevent double-submit on save and update button state during saving ([2086e78](https://github.com/CNCmarlin/3d-model-muncher/commit/2086e78ce8cbe722cd97ef497c1301825be9807e)), closes [#27](https://github.com/CNCmarlin/3d-model-muncher/issues/27)
* prevent duplicate tags, increase tag display limit in filter sidebar ([67f40cf](https://github.com/CNCmarlin/3d-model-muncher/commit/67f40cf8092d0b371bf8f22d8ef52f6098173539))
* reduce gap in Card componen ([71e9cde](https://github.com/CNCmarlin/3d-model-muncher/commit/71e9cdef04f46a18d561d454298b53236d1b6d1e))
* refactor userDefined structure in model-related components ([edb63dc](https://github.com/CNCmarlin/3d-model-muncher/commit/edb63dc63ca3347d51ca45339325fbbe2beafb64))
* refine model selection logic and enhance corrupted files handling in SettingsPage ([3b59480](https://github.com/CNCmarlin/3d-model-muncher/commit/3b594801cd299becf18b87e35183feaf4822dc40))
* remove duplicate group in UI after selecting a file to keep, without having to rescan ([c37657f](https://github.com/CNCmarlin/3d-model-muncher/commit/c37657f6e9ab79f25ff10e8301640962e0ec2fcf)), closes [#40](https://github.com/CNCmarlin/3d-model-muncher/issues/40)
* remove unnecessary Heart icon from the thank you message in SettingsPage ([b2502a8](https://github.com/CNCmarlin/3d-model-muncher/commit/b2502a82f6f3cb287d65cb2ebd2bbdee98f22ae5))
* remove unused Eye icon import from FilterSidebar component ([c8973a0](https://github.com/CNCmarlin/3d-model-muncher/commit/c8973a04e83fb3b4c22b589a000a3e8ff6d7b122))
* remove version numbers from imports for consistency across UI components ([ff6db70](https://github.com/CNCmarlin/3d-model-muncher/commit/ff6db7099b69bc0311e983233f3f57daea0b4197))
* reordered bulk edit drawer options, moved image generation into section, updated icons ([acb20d8](https://github.com/CNCmarlin/3d-model-muncher/commit/acb20d873b493a91c20790e7319654b1940fcf18)), closes [#26](https://github.com/CNCmarlin/3d-model-muncher/issues/26)
* reset editing state when ModelDetailsDrawer closes ([ef999da](https://github.com/CNCmarlin/3d-model-muncher/commit/ef999da46c5d81db2c3426ff385c53263014b4c2))
* reset image generation state on drawer close to prevent lingering alerts ([0da234b](https://github.com/CNCmarlin/3d-model-muncher/commit/0da234b93c284d34ce44974224ce0a4297b54325))
* resolve model loading issues in preview mode by adding Vite proxy configuration and updating API calls to use relative URLs ([70e635d](https://github.com/CNCmarlin/3d-model-muncher/commit/70e635d41480d1331bb708d95741bbef1fa47954))
* restore remove tags from edited model in ModelDetailsDrawer ([2b05dc9](https://github.com/CNCmarlin/3d-model-muncher/commit/2b05dc9d8cb0c622ce5642678553913c0515a7a2))
* restoring description, handle clearing user-defined description in model save process ([de6c923](https://github.com/CNCmarlin/3d-model-muncher/commit/de6c9237cbe9590f48d6a5ebbf97b51ee45f734d)), closes [#35](https://github.com/CNCmarlin/3d-model-muncher/issues/35)
* settings default filters now apply on reload, sets active filters in UI ([8d5b43d](https://github.com/CNCmarlin/3d-model-muncher/commit/8d5b43d61b518ff1dc74714c13d3f2385691891d))
* show release notes dialog only for major.minor version changes and persist user preference ([49e24c4](https://github.com/CNCmarlin/3d-model-muncher/commit/49e24c49efde279fa443c3eb25caea9f9bf32a3c))
* sorting functionality for collections ([1b3c352](https://github.com/CNCmarlin/3d-model-muncher/commit/1b3c352104dbc183cd083cee5463a31f1d3fa671))
* switched to use userDefined description for generative ai ([442d74c](https://github.com/CNCmarlin/3d-model-muncher/commit/442d74c4b9836565a75638429d37261e8f407d1e))
* thumbnail image not displaying in settings, other styling updates ([efbcef0](https://github.com/CNCmarlin/3d-model-muncher/commit/efbcef07e2fa3e3133bf2ae6ab102334415233c9))
* toast secondary text color, fix drawer width on smaller screens exceeding container ([3d07acc](https://github.com/CNCmarlin/3d-model-muncher/commit/3d07acced08196eadb47e4889a59effcafc3e95d)), closes [#21](https://github.com/CNCmarlin/3d-model-muncher/issues/21)
* toggle for showing more tags in the FilterSidebar, moved clear filter to footer ([8889383](https://github.com/CNCmarlin/3d-model-muncher/commit/8889383a16e466cd9c251c00aa26bb39b388f989))
* typo in readme ([aa7724f](https://github.com/CNCmarlin/3d-model-muncher/commit/aa7724f479c27ada8a9fcef7fe113ad6100782a5))
* update .gitignore for data dir and removed testing config ([139f26b](https://github.com/CNCmarlin/3d-model-muncher/commit/139f26bfe5909595fbad921a3b176da94ba4db50))
* update @types/node version in package.json and package-lock.json; refactor model scanning logic in AppContent; enhance duplicate model handling in clientUtils; adjust config path in ConfigManager; remove unused LoadingManager in useSafeThreeMFLoader; add node type to tsconfig ([926e271](https://github.com/CNCmarlin/3d-model-muncher/commit/926e2714206592b6ad0e7c98fceb19d2eb1fc7ea))
* update bulk edit save buttons to show loading spinner ([11b72c3](https://github.com/CNCmarlin/3d-model-muncher/commit/11b72c3ceba200ce48ac562bbb3260b64a3c7076))
* update Docker image reference in production compose file ([e62809a](https://github.com/CNCmarlin/3d-model-muncher/commit/e62809a92c97761c723a9b1b942ef6d259e6c167))
* update Docker metadata tags to include branch suffix and enable default branch versioning ([500a7e8](https://github.com/CNCmarlin/3d-model-muncher/commit/500a7e86383cffa1b46e1f89d6dd80e3c62c8790))
* update Docker tags pattern for versioning and adjust tag format in release configuration ([e8cd726](https://github.com/CNCmarlin/3d-model-muncher/commit/e8cd726c26a3c2af40914a1a5f7e28056236f61a))
* update event handling that prevented tag autocomplete selection for collection edits ([3fcfada](https://github.com/CNCmarlin/3d-model-muncher/commit/3fcfada65660877ea7a47c94ec047a88a005bf2f))
* update license display strings to use standardized abbreviations found across models ([599bdb9](https://github.com/CNCmarlin/3d-model-muncher/commit/599bdb9df7a4619ef5b26bcfe4d1ae47b01e647a)), closes [#34](https://github.com/CNCmarlin/3d-model-muncher/issues/34)
* update normalizeTime function to round up minutes when hours are present ([b463f9b](https://github.com/CNCmarlin/3d-model-muncher/commit/b463f9b507604381e3977dac6ee9a3fbb01c9849))
* update sonner dependency to version 2.0.7 and adjust related imports; clean up Attributions.md; refactor hash check result structure in fileManager; set default price to 0 in parse3MF function ([eab637d](https://github.com/CNCmarlin/3d-model-muncher/commit/eab637d95a3fc8f1f31a5efdc97ae189acdfda49))
* update test and server collection file handling ([a6ac813](https://github.com/CNCmarlin/3d-model-muncher/commit/a6ac8132386b13866ea26cbe671f49c265b8e173))
* update workflow ([51a4ea5](https://github.com/CNCmarlin/3d-model-muncher/commit/51a4ea507bdd1cd548143c31d9f64a2d6e1273d7))
* updated release notes dialog ([ce1f8cb](https://github.com/CNCmarlin/3d-model-muncher/commit/ce1f8cbc195affc484314c16b440c391d6992de7))
* use scrollarea to remove native scrollbars in settings tag listing and dialog ([0da6810](https://github.com/CNCmarlin/3d-model-muncher/commit/0da6810b4c20fbaefede2255475aa634acd6c72a)), closes [#32](https://github.com/CNCmarlin/3d-model-muncher/issues/32)


### Features

* add API endpoint for deleting models and update duplicate removal logic ([04bea2c](https://github.com/CNCmarlin/3d-model-muncher/commit/04bea2c011592634f49259bae22c5f7b9573d1ca))
* add API endpoint to load models from munchie.json files and enhance corrupted file handling in SettingsPage ([6cd4423](https://github.com/CNCmarlin/3d-model-muncher/commit/6cd442388f60d48786a8b52e1d5c167f91c2a79c))
* add API endpoint to regenerate munchie files and integrate with bulk edit functionality ([6100fb1](https://github.com/CNCmarlin/3d-model-muncher/commit/6100fb19f015119925d7de8af882c6bf9eb30066))
* add automated release and versioning system ([3a3a7ce](https://github.com/CNCmarlin/3d-model-muncher/commit/3a3a7ce03afdf2c5d0932c05723c903ed0188621))
* add backend build script and enhance API for model management ([5eb954c](https://github.com/CNCmarlin/3d-model-muncher/commit/5eb954c51b2624c3c15daa40d698e881099c96f5))
* add backup and restore functionality for munchie.json files ([fcd5cd2](https://github.com/CNCmarlin/3d-model-muncher/commit/fcd5cd28b9c9850413b050cea418ccdeff20f516))
* add collections feature with CRUD operations ([31422b4](https://github.com/CNCmarlin/3d-model-muncher/commit/31422b4b9ebf567c7e6138e98a88a1f5fc4ca9ce)), closes [#42](https://github.com/CNCmarlin/3d-model-muncher/issues/42)
* add created and lastModified timestamps to model metadata ([2ba5af1](https://github.com/CNCmarlin/3d-model-muncher/commit/2ba5af1e32d1020e6ae7dd3164de559dee9d2393))
* Add delete confirmation dialog for bulk model deletion ([6be944d](https://github.com/CNCmarlin/3d-model-muncher/commit/6be944d1a9228aa8c161f2197d6bced46f712054))
* add designer field to model and update related components ([7d14bb7](https://github.com/CNCmarlin/3d-model-muncher/commit/7d14bb79fbb4d2111995daa0515e58467efc4d49))
* add Docker support with multi-stage build, Docker Compose, and deployment documentation ([7e1c8fa](https://github.com/CNCmarlin/3d-model-muncher/commit/7e1c8fa07a028fd8b3e87d597ba84db22f6637e4))
* add Dockerfile and docker-compose.yml for containerized application setup ([5d8c381](https://github.com/CNCmarlin/3d-model-muncher/commit/5d8c381874656dd91db2dedb7a42903979083d8d))
* add dropdown for related files download in ModelCard component ([796f085](https://github.com/CNCmarlin/3d-model-muncher/commit/796f08542a10ca14616a41df91dc53d2c3e64eb9))
* add duplicate group dialog management and improve remove duplicates handling ([9bbf9fc](https://github.com/CNCmarlin/3d-model-muncher/commit/9bbf9fc32a7b7b83cff8e85ad227edf35b35e777))
* Add environment configuration files for Docker, production, and Unraid setups ([e16eedc](https://github.com/CNCmarlin/3d-model-muncher/commit/e16eedce79613bd993bb89b1726b6d4f0677a2b4))
* add favicon and touch icons; update loading indicators in AppContent and FilterSidebar; enhance empty state in ModelGrid ([1da9532](https://github.com/CNCmarlin/3d-model-muncher/commit/1da9532d0509f135b59f035b6869d51b50abb56e))
* add file type selection for model deletion in App component ([8e95571](https://github.com/CNCmarlin/3d-model-muncher/commit/8e9557140b7ff55fd57c56e33d85b7977a1c7c14))
* add functionality to upload images in edit mode with thumbnail handling ([3df42e3](https://github.com/CNCmarlin/3d-model-muncher/commit/3df42e31c466feb43c380855fd04472363d81eca))
* add G-code settings and  G-code parsing ([f8283a5](https://github.com/CNCmarlin/3d-model-muncher/commit/f8283a591f6fe900437167784d546f0acd04f961)), closes [#43](https://github.com/CNCmarlin/3d-model-muncher/issues/43)
* add getDisplayPath helper function for improved model file path display in SettingsPage ([d405a82](https://github.com/CNCmarlin/3d-model-muncher/commit/d405a823a8081d7f017bcf3f6fe53d40050a75f1))
* add hash to munchie jsons, eliminated mock data ([52b3736](https://github.com/CNCmarlin/3d-model-muncher/commit/52b37362f226937450921eedaa9a614499d180f4))
* add hidden model functionality with filtering and UI updates across components ([e29325c](https://github.com/CNCmarlin/3d-model-muncher/commit/e29325ceacdd812d016fa6e2feee441ba63a28b2))
* add image capture functionality to ModelViewer3D and saving to model images ([3b1c79c](https://github.com/CNCmarlin/3d-model-muncher/commit/3b1c79c2d71eb584f438ff276f436e1063a8123c))
* add migration endpoint for legacy images and implement release notes dialog ([eca6972](https://github.com/CNCmarlin/3d-model-muncher/commit/eca6972093b8cdf9b71a042dfa7060debfcc44cf))
* add model upload functionality with folder management ([253f5d3](https://github.com/CNCmarlin/3d-model-muncher/commit/253f5d3d5b034e8d425d44fec2948d6cbeb494a3))
* add options to include image and model name in AI prompts ([d647121](https://github.com/CNCmarlin/3d-model-muncher/commit/d64712165d88ba3a6d83357ac36b915971505393))
* add placeholder image handling and enhance file verification UI in SettingsPage ([ae188e3](https://github.com/CNCmarlin/3d-model-muncher/commit/ae188e314dc2afb5ebf1d77deae841f71f7bfaef))
* add preview script to package.json; update .gitignore to include build directory ([f5d4266](https://github.com/CNCmarlin/3d-model-muncher/commit/f5d426603cadea3bd58fd750b735493067e5ff0b))
* add print time and filament fields to model editing ([ac5ca54](https://github.com/CNCmarlin/3d-model-muncher/commit/ac5ca5417067a5390fc25f8debadde4c3d607ca4))
* Add script to copy models to build directory and update build process ([fd33590](https://github.com/CNCmarlin/3d-model-muncher/commit/fd3359020861db69b63f687bb4df5006d42fad3f))
* add shortcut to File Integrity view from Appbar ([a3b6254](https://github.com/CNCmarlin/3d-model-muncher/commit/a3b6254c2a9906f15783f2ea1ba9a0735f38a549)), closes [#11](https://github.com/CNCmarlin/3d-model-muncher/issues/11)
* add sorting functionality to model filters ([e720c0e](https://github.com/CNCmarlin/3d-model-muncher/commit/e720c0e13310f9de741222e58c1dbb07c529c66b))
* add STL-specific print settings fields, disabled or hidden for 3mf files ([04feec4](https://github.com/CNCmarlin/3d-model-muncher/commit/04feec40ef93a6a1fec66b6ef7d017a877245464))
* add Unraid-optimized Dockerfile, docker-compose file, and setup guide; implement health check endpoint in server ([d5f189f](https://github.com/CNCmarlin/3d-model-muncher/commit/d5f189fa24bce57b6d63c7741b0a00fdbdc2faf2))
* added bulk editing related files, can now link other models together ([1dd0bb3](https://github.com/CNCmarlin/3d-model-muncher/commit/1dd0bb367713c17cb2dfb50b47f72434025acfb3))
* added category deletion, fix renaming issue, fix filtering issue ([bc4fa83](https://github.com/CNCmarlin/3d-model-muncher/commit/bc4fa83063a687bb0932d9b53cea2d9679395a03)), closes [#12](https://github.com/CNCmarlin/3d-model-muncher/issues/12)
* added experimental AI workflow to suggest metadata for description, category, and tags ([0fa647f](https://github.com/CNCmarlin/3d-model-muncher/commit/0fa647f8c89ee4c82516ba8293f5938ca0fa92cb))
* added file scanning and generation actions to top toolbar ([c1968d5](https://github.com/CNCmarlin/3d-model-muncher/commit/c1968d570e4c54812d3269be56d7b1cf9d7d766d)), closes [#11](https://github.com/CNCmarlin/3d-model-muncher/issues/11)
* added file type filtering for model view ([6cb5fa7](https://github.com/CNCmarlin/3d-model-muncher/commit/6cb5fa760eb1a212d8b3605ff633b0eb45cacdfe))
* added price display ([4c4eaa8](https://github.com/CNCmarlin/3d-model-muncher/commit/4c4eaa8af7bba34d1904cb75f75660baac08757e))
* allow restoring of descriptions to original, user changes are stored separately ([0907694](https://github.com/CNCmarlin/3d-model-muncher/commit/090769476b52e1e81b38677490d64d5d0c3fad3b))
* bulk create thumbnails for models with no images, simpler logging, verbose switch in settings ([b8fe4fd](https://github.com/CNCmarlin/3d-model-muncher/commit/b8fe4fdece83b2469fcd50a6aea8394465fc1fe8)), closes [#30](https://github.com/CNCmarlin/3d-model-muncher/issues/30)
* can add categories and updated configuration management and UI preferences handling ([df658de](https://github.com/CNCmarlin/3d-model-muncher/commit/df658de1cc03a7f62f4583586a97eeae74209c46))
* can add related files to a model, validation and saving enhancements ([65f7af6](https://github.com/CNCmarlin/3d-model-muncher/commit/65f7af6f89e5a0323d36404b70c9c0c038d55751))
* choose icon for category ([d50dd3a](https://github.com/CNCmarlin/3d-model-muncher/commit/d50dd3a11959b6107e17a731798322e6fdbc9f39))
* clear generate results when switching tabs to avoid stale counts ([51574d8](https://github.com/CNCmarlin/3d-model-muncher/commit/51574d83afca5aa26ead4c9282ae95a564b87e8b))
* custom color options to ModelViewer3D components ([0fcaadc](https://github.com/CNCmarlin/3d-model-muncher/commit/0fcaadce6c50ce6c75639fce84b615327ddfc085))
* enhance 3MF metadata parsing and file integrity checks ([2df0800](https://github.com/CNCmarlin/3d-model-muncher/commit/2df080096918ce77a6259fdc2522513975e5b594))
* enhance backup and restore functionality to include collections ([1605cf2](https://github.com/CNCmarlin/3d-model-muncher/commit/1605cf28146984b1bcd634c692fc28786b2db16b))
* enhance bulk delete functionality and improve alert dialog components ([d88845e](https://github.com/CNCmarlin/3d-model-muncher/commit/d88845e82f317842e5b5a113ff2b2e9d7d08bcbd))
* enhance configuration management with validation, theme handling, and auto-save functionality ([f6805dd](https://github.com/CNCmarlin/3d-model-muncher/commit/f6805ddd305362ad71632772deac9789aef93931))
* enhance image selection and drag-and-drop functionality in edit mode to set main image ([491249b](https://github.com/CNCmarlin/3d-model-muncher/commit/491249b5df239fd7aff67ebe6499b691e2250f32))
* enhance metadata parsing by adding HTML entity decoding and extracting layer height and infill from profile title ([5f1abcf](https://github.com/CNCmarlin/3d-model-muncher/commit/5f1abcf3607bee1a514f3237649d24f8ca623e43))
* enhance model download functionality to use model's URL for accurate file paths ([f504a97](https://github.com/CNCmarlin/3d-model-muncher/commit/f504a972040c76859ff671035ca42bcdca61b0ce))
* enhance model file handling to support both lowercase and uppercase STL extensions ([ee53740](https://github.com/CNCmarlin/3d-model-muncher/commit/ee537402053e255d256dd40cb61861ceb48ced45))
* enhance model file path handling and add saving state management in BulkEditDrawer ([a7944ab](https://github.com/CNCmarlin/3d-model-muncher/commit/a7944ab5074929d995028187122fda7a17b5732a))
* enhance model refresh functionality with improved toast messages and add Toaster component ([46c8972](https://github.com/CNCmarlin/3d-model-muncher/commit/46c8972f28d3874c7586333cf71eb6a123f9f0e9))
* enhance model refresh logic to fetch updated metadata from backend ([5e3b47b](https://github.com/CNCmarlin/3d-model-muncher/commit/5e3b47b9ca983764690a7eb227215b264794a60f))
* enhance model saving functionality and update model interface ([1d5a0e1](https://github.com/CNCmarlin/3d-model-muncher/commit/1d5a0e12926daa4c8d8580f3a31df7c5ec64523e))
* enhance model scanning and JSON generation to support STL files and improve file type handling ([d9e52eb](https://github.com/CNCmarlin/3d-model-muncher/commit/d9e52ebec4d4f3b67e63046d0184fa4776909ca3))
* enhance model viewer to support STL files and improve file path conversions ([562a37e](https://github.com/CNCmarlin/3d-model-muncher/commit/562a37e8820ba85f4675f40b78d35338a126b71e))
* enhance ModelUploadDialog with category and tags support for uploaded models ([16277dc](https://github.com/CNCmarlin/3d-model-muncher/commit/16277dcfee8d37a67ef4d8d72188aa0217f5575a))
* enhance selection mode controls and integrate bulk actions in ModelGrid component ([6b6528a](https://github.com/CNCmarlin/3d-model-muncher/commit/6b6528a02baf76742e42b4c8f37aae1c90fa8d26))
* enhance status message handling with toast notifications using sonner's API ([c5d6446](https://github.com/CNCmarlin/3d-model-muncher/commit/c5d644672efa4e7db151f708e72759f858f3833c))
* enhance tag management with async save operations and UI updates ([7cd64c9](https://github.com/CNCmarlin/3d-model-muncher/commit/7cd64c9bd187eabfd44a8cd1cdfec026ae53a2f6))
* enhance tags display with icon and improve pricing section layout ([14a5e1c](https://github.com/CNCmarlin/3d-model-muncher/commit/14a5e1c48763dc1021c933cdb6f13018bb2aca6c))
* enhance TagsInput component for dynamic suggestions (autocomplete) ([5c815cd](https://github.com/CNCmarlin/3d-model-muncher/commit/5c815cd2efcca21215a89ec7d50d9ecbdf2daf46)), closes [#25](https://github.com/CNCmarlin/3d-model-muncher/issues/25)
* Enhance UI components with cursor pointer styles for better interactivity ([81b6f87](https://github.com/CNCmarlin/3d-model-muncher/commit/81b6f875ee63d9a946f7ef4c1967b467a489a25f))
* exclude computed properties from model updates in save-model API and JSON path conversion ([b47825c](https://github.com/CNCmarlin/3d-model-muncher/commit/b47825ccf81c6977678dff3ce1dbe8687b354ca4))
* **experimentaltab:** add experimental tab with lazy loading for settings page ([fefcf0c](https://github.com/CNCmarlin/3d-model-muncher/commit/fefcf0ca57e0898745a0597a59cd9e28d9cf1397))
* implement bulk delete functionality for models with API integration and enhanced user feedback ([d02da05](https://github.com/CNCmarlin/3d-model-muncher/commit/d02da0557a122a0ccc39980d37fd3c727c36df3d))
* implement download functionality for model files in ModelCard and ModelDetailsDrawer components ([03b4c3c](https://github.com/CNCmarlin/3d-model-muncher/commit/03b4c3c2c8131495269f093265931f34a80a5898))
* implement image compression utility and enhance image upload handling in ModelDetailsDrawer ([bd7282b](https://github.com/CNCmarlin/3d-model-muncher/commit/bd7282bd2a880c758a45be62183dd353e66d39bf))
* implement in-window fullscreen mode for image previews and enhance keyboard navigation ([88c4c83](https://github.com/CNCmarlin/3d-model-muncher/commit/88c4c8364c5df8befcaa74d44ae659caf7e5008d))
* implement ModelThumbnail component for improved thumbnail handling in SettingsPage ([3b4f74e](https://github.com/CNCmarlin/3d-model-muncher/commit/3b4f74e7b6fa57b48f3a91f67d682192ce81cf1e))
* implement toast notifications for status messages in SettingsPage ([24726b3](https://github.com/CNCmarlin/3d-model-muncher/commit/24726b33210476d8e7b350577dde3905feb9c852))
* Improve layout and responsiveness of backup and restore strategy sections in SettingsPage ([3e1dbb6](https://github.com/CNCmarlin/3d-model-muncher/commit/3e1dbb6788b87c67267478aa84c37d935af0556a))
* integrate ImageWithFallback component for placeholder image ([bb0b43b](https://github.com/CNCmarlin/3d-model-muncher/commit/bb0b43b9081641ae0eb4e9f8d4463e26c844d27a))
* integrate ScrollArea component for improved scrolling in BulkEditDrawer, FilterSidebar, and ModelDetailsDrawer ([00461b6](https://github.com/CNCmarlin/3d-model-muncher/commit/00461b671a444fc3fb98a630b0e9e5f12b4dd310))
* loads 3dmodel removing  placeholders ([140fef2](https://github.com/CNCmarlin/3d-model-muncher/commit/140fef2d71c429234b9050fdd0cab2266d84d03f))
* made title clickable to route to home page ([4227be1](https://github.com/CNCmarlin/3d-model-muncher/commit/4227be1b4a645cbe3954813b188b75b477f67a0c))
* pass models prop to FilterSidebar for dynamic tag generation ([3b152d9](https://github.com/CNCmarlin/3d-model-muncher/commit/3b152d98e7119fc1c11b1920517cb201698741b5))
* Refactor category ID display and button layout for improved readability ([1d8bbdc](https://github.com/CNCmarlin/3d-model-muncher/commit/1d8bbdc419f033bdf76b57722e58e8fd057aa412))
* refresh model metadata after bulk deletion to ensure UI consistency ([fc026a6](https://github.com/CNCmarlin/3d-model-muncher/commit/fc026a64a05d3040f513517eeced98c31af81859))
* rotate model groups to upright position for STL and 3MF files ([3f812d2](https://github.com/CNCmarlin/3d-model-muncher/commit/3f812d2274c5d00e7d28a25614453f088755dafe))
* scan model directory and generate JSON ([cf60464](https://github.com/CNCmarlin/3d-model-muncher/commit/cf6046454382e875450110483bedb34e88194d50))
* **settings:** add unmapped categories feature to display and add categories from model metadata ([6ce5c89](https://github.com/CNCmarlin/3d-model-muncher/commit/6ce5c89c226f75742a0e00a8b9035e3ac30065ea))
* update documentation to include backup and restore feature in README ([ec48975](https://github.com/CNCmarlin/3d-model-muncher/commit/ec48975bd2de1b90d1ed1cc0d25f09b893a6c987))
* update donation dialog icons and links; replace empty state image; add community mascot image ([a8f9224](https://github.com/CNCmarlin/3d-model-muncher/commit/a8f92243afbb3dead63b3a838208df08da53590d))
* update file path handling in model saving functions to ensure correct JSON file paths ([afb2d6b](https://github.com/CNCmarlin/3d-model-muncher/commit/afb2d6b306387cf1f0f48df5861799e637b9e152))
* update ModelDetailsDrawer to add model path rearranged sections and display conditionals ([0735177](https://github.com/CNCmarlin/3d-model-muncher/commit/0735177534e33b7ecce2ef7deaace46e6c95e7bc))
* update print settings to replace 'supports' with 'nozzle' in model and parsing logic ([009f860](https://github.com/CNCmarlin/3d-model-muncher/commit/009f86017f7940ec8381fb0ff352669e81faa8be))
* update README and added demo gif ([dc65fe7](https://github.com/CNCmarlin/3d-model-muncher/commit/dc65fe761c186f2be9451da02e23df1732826046))
* Update settings category section to allow renaming and updating corresponding models. ([b2949ab](https://github.com/CNCmarlin/3d-model-muncher/commit/b2949ab76b485e161d440147266d53de889f744f))
* Update Slider component for improved cursor interactivity and hide UI demo button ([9bfa5ce](https://github.com/CNCmarlin/3d-model-muncher/commit/9bfa5cea7c002f2bacd9af5d96de960b7faeb010))
* Update Tabs layout in SettingsPage for improved responsiveness and styling ([2cae175](https://github.com/CNCmarlin/3d-model-muncher/commit/2cae1753193437d4783e288b613716125448372e))


### BREAKING CHANGES

* This establishes the new automated release process

# [0.15.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.14.4...v0.15.0) (2025-11-29)


### Bug Fixes

* enhance G-code support with improved extraction and file preservation ([48b054a](https://github.com/robsturgill/3d-model-muncher/commit/48b054acbc10edb20de506efe7dd364152a6f4fd))
* enhance G-code tests, handling with path validation and update README for clarity ([1c14df9](https://github.com/robsturgill/3d-model-muncher/commit/1c14df9d01cac3048809e97252eb85d575417d47))
* g-code enhancement for storing file with model not just processing ([4243aac](https://github.com/robsturgill/3d-model-muncher/commit/4243aac0ec9e30f7efe83756714802ae2043a2c7))
* handling related files view button when uploading gcode file types ([6bd80e8](https://github.com/robsturgill/3d-model-muncher/commit/6bd80e85e6efe1fdd502323a43b6e669c51173e0))
* implement G-code archive filtering in upload and scan processes ([156e689](https://github.com/robsturgill/3d-model-muncher/commit/156e6894a1f070010c92dd8c2233cf1651dd1709))
* update normalizeTime function to round up minutes when hours are present ([b463f9b](https://github.com/robsturgill/3d-model-muncher/commit/b463f9b507604381e3977dac6ee9a3fbb01c9849))


### Features

* add G-code settings and  G-code parsing ([f8283a5](https://github.com/robsturgill/3d-model-muncher/commit/f8283a591f6fe900437167784d546f0acd04f961)), closes [#43](https://github.com/robsturgill/3d-model-muncher/issues/43)

## [0.14.4](https://github.com/robsturgill/3d-model-muncher/compare/v0.14.3...v0.14.4) (2025-11-28)


### Bug Fixes

* add 'Show Missing Images' filter option in FilterSidebar and update related state management ([7fa3a7d](https://github.com/robsturgill/3d-model-muncher/commit/7fa3a7db6d14453355bf089d569fad37161f48f9)), closes [#52](https://github.com/robsturgill/3d-model-muncher/issues/52)
* add sort by option in settings and update related state management in filters ([32e01c2](https://github.com/robsturgill/3d-model-muncher/commit/32e01c2428b1dc015b84fab9bc2b698439fa7c28))

## [0.14.3](https://github.com/robsturgill/3d-model-muncher/compare/v0.14.2...v0.14.3) (2025-10-12)


### Bug Fixes

* collections in the main grid now respect the active search, category, and tag filters ([a4e2709](https://github.com/robsturgill/3d-model-muncher/commit/a4e2709298bb4a50cb86e14576858b1a2987064c)), closes [#54](https://github.com/robsturgill/3d-model-muncher/issues/54)
* drawer handling to close when clicked outside but prevent accidental close when editing ([77ba9eb](https://github.com/robsturgill/3d-model-muncher/commit/77ba9ebf1ed9145b4b4031981fb688019ba595b8))
* improve dropdown behavior for tag input field, only display after initial character input ([ebe902d](https://github.com/robsturgill/3d-model-muncher/commit/ebe902d5bfd39ef2c51cf8b86f0b97aacdd90233))
* normalize category selection saved value across edit modes ([60eb2b5](https://github.com/robsturgill/3d-model-muncher/commit/60eb2b57bbb6bc6b6a8aa99e38fadda25aa289d8)), closes [#53](https://github.com/robsturgill/3d-model-muncher/issues/53)
* toggle for showing more tags in the FilterSidebar, moved clear filter to footer ([8889383](https://github.com/robsturgill/3d-model-muncher/commit/8889383a16e466cd9c251c00aa26bb39b388f989))

## [0.14.2](https://github.com/robsturgill/3d-model-muncher/compare/v0.14.1...v0.14.2) (2025-10-11)


### Bug Fixes

* add removal functionality for selected models in collection editing ([b164884](https://github.com/robsturgill/3d-model-muncher/commit/b16488489f7270696c93cb6a8923835d4fe9b711))
* enhance collection editing with mode toggle, select new or from existing collection ([8dae0cb](https://github.com/robsturgill/3d-model-muncher/commit/8dae0cbb8851f60c1eec7e48099f0792061e7da2)), closes [#50](https://github.com/robsturgill/3d-model-muncher/issues/50)
* implement selection controls in collection view, refactored select mode to reusable component ([0ab7e70](https://github.com/robsturgill/3d-model-muncher/commit/0ab7e70444782d59c2f8d680a05737db4f6f5e45)), closes [#51](https://github.com/robsturgill/3d-model-muncher/issues/51)
* improve collection display for list view, added missing actions button for collection ([e818b6a](https://github.com/robsturgill/3d-model-muncher/commit/e818b6a8fb2f1087f11c809fee38242d92cedb8b))
* reordered bulk edit drawer options, moved image generation into section, updated icons ([acb20d8](https://github.com/robsturgill/3d-model-muncher/commit/acb20d873b493a91c20790e7319654b1940fcf18)), closes [#26](https://github.com/robsturgill/3d-model-muncher/issues/26)

## [0.14.1](https://github.com/robsturgill/3d-model-muncher/compare/v0.14.0...v0.14.1) (2025-10-10)


### Bug Fixes

* implement add/remove model from collection functionality and update hidden model handling ([774cada](https://github.com/robsturgill/3d-model-muncher/commit/774cada1e49b78e7c211c181a9b27bc03ad5cd5c))

# [0.14.0](https://github.com/robsturgill/3d-model-muncher/compare/v0.13.3...v0.14.0) (2025-10-09)


### Bug Fixes

* default category to 'Uncategorized' in CollectionEditDrawer ([dd68423](https://github.com/robsturgill/3d-model-muncher/commit/dd68423f5e68ee7e4ad370a4516547a509e7781b))
* enhance drawer to limit closing when editing ([666fd95](https://github.com/robsturgill/3d-model-muncher/commit/666fd95b8e71888bc8af0f0dfcfa6f5c492bfd5e))
* file type filter to control collection visibility in model views ([e85c39e](https://github.com/robsturgill/3d-model-muncher/commit/e85c39e2af5c2ea0d6dc3deb46058b1a651b2e73))
* implement worker-specific config handling to avoid clobbering main config during tests ([8fdd5ae](https://github.com/robsturgill/3d-model-muncher/commit/8fdd5ae22d354039885032c936c4caf38756c72c))
* issue with hidden model filter when exiting collection view ([2c7c9be](https://github.com/robsturgill/3d-model-muncher/commit/2c7c9be0ccb0960b29480a70ab1c89e4593b9102))
* persist STL print setting changes when regenerating munchie.json ([5f2f48b](https://github.com/robsturgill/3d-model-muncher/commit/5f2f48be6627411dc75f7fe31d211d2af7a8d5e7))
* sorting functionality for collections ([1b3c352](https://github.com/robsturgill/3d-model-muncher/commit/1b3c352104dbc183cd083cee5463a31f1d3fa671))
* update event handling that prevented tag autocomplete selection for collection edits ([3fcfada](https://github.com/robsturgill/3d-model-muncher/commit/3fcfada65660877ea7a47c94ec047a88a005bf2f))
* update test and server collection file handling ([a6ac813](https://github.com/robsturgill/3d-model-muncher/commit/a6ac8132386b13866ea26cbe671f49c265b8e173))


### Features

* add collections feature with CRUD operations ([31422b4](https://github.com/robsturgill/3d-model-muncher/commit/31422b4b9ebf567c7e6138e98a88a1f5fc4ca9ce)), closes [#42](https://github.com/robsturgill/3d-model-muncher/issues/42)
* add STL-specific print settings fields, disabled or hidden for 3mf files ([04feec4](https://github.com/robsturgill/3d-model-muncher/commit/04feec40ef93a6a1fec66b6ef7d017a877245464))
* enhance backup and restore functionality to include collections ([1605cf2](https://github.com/robsturgill/3d-model-muncher/commit/1605cf28146984b1bcd634c692fc28786b2db16b))
* enhance ModelUploadDialog with category and tags support for uploaded models ([16277dc](https://github.com/robsturgill/3d-model-muncher/commit/16277dcfee8d37a67ef4d8d72188aa0217f5575a))
* enhance TagsInput component for dynamic suggestions (autocomplete) ([5c815cd](https://github.com/robsturgill/3d-model-muncher/commit/5c815cd2efcca21215a89ec7d50d9ecbdf2daf46)), closes [#25](https://github.com/robsturgill/3d-model-muncher/issues/25)

## [0.13.3](https://github.com/robsturgill/3d-model-muncher/compare/v0.13.2...v0.13.3) (2025-10-02)


### Bug Fixes

* enhance model selection with shift-click range support and update event handling ([c0d87d5](https://github.com/robsturgill/3d-model-muncher/commit/c0d87d5d327ac5e4a9c6339ab0a8ded71135d173)), closes [#45](https://github.com/robsturgill/3d-model-muncher/issues/45)
* implement category selection navigation from settings to models view ([2358b1b](https://github.com/robsturgill/3d-model-muncher/commit/2358b1b5e9109f3bef73457cbaf348382e0bf688))

## [0.13.2](https://github.com/robsturgill/3d-model-muncher/compare/v0.13.1...v0.13.2) (2025-09-28)


### Bug Fixes

* download functionality by preserving subdirectory structure and improving filename handling ([3b713a3](https://github.com/robsturgill/3d-model-muncher/commit/3b713a3a3342ffd009c85415f1256d4765894161))
* show release notes dialog only for major.minor version changes and persist user preference ([49e24c4](https://github.com/robsturgill/3d-model-muncher/commit/49e24c49efde279fa443c3eb25caea9f9bf32a3c))

## [0.13.1](https://github.com/robsturgill/3d-model-muncher/compare/v0.13.0...v0.13.1) (2025-09-28)


### Bug Fixes

* add preview generation for uploaded models, increase file upload size limit to 1GB ([c13d713](https://github.com/robsturgill/3d-model-muncher/commit/c13d713c53f8caeba9ea01dc55b0417286e12d51)), closes [#28](https://github.com/robsturgill/3d-model-muncher/issues/28)
* additional hardening, prevent accidental overwrites of model files by remapping to munchie JSON ([7c2c761](https://github.com/robsturgill/3d-model-muncher/commit/7c2c761d602a7aee2e52ca10a58968460a9c6e42))
* category list disappearing from bulk edit drawer ([ad89604](https://github.com/robsturgill/3d-model-muncher/commit/ad89604e83ca099bdace03190f164876b0263d23))
* disable generate image button when other bulk edits are attempted, styling updates to drawer ([2d7d7c7](https://github.com/robsturgill/3d-model-muncher/commit/2d7d7c765aeb4e394ea39b67b101dfe181699158))
* reset image generation state on drawer close to prevent lingering alerts ([0da234b](https://github.com/robsturgill/3d-model-muncher/commit/0da234b93c284d34ce44974224ce0a4297b54325))

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

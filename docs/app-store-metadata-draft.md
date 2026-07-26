# App Store Metadata Draft

This is a bilingual working draft for App Store Connect. Character limits,
question wording, legal answers, and storefront availability must be checked
against the live App Store Connect forms before submission.

## Chinese (Simplified)

**App Name**

Pluto 人生使用说明书

**Subtitle**

本地生成你的人类图与解读

**Promotional Text**

输入出生时间与地点，在设备上生成一份可保存、可分享、可离线重看的个人说明书。

**Description**

Pluto 人生使用说明书是一款用于自我探索与个人反思的人类图工具。

输入出生日期、当地时间和出生地点，应用会在设备上使用 Swiss
Ephemeris 计算图谱，生成 BodyGraph、类型、策略、内在权威、人生角色、
定义、轮回交叉和基础解读。

主要功能：

- 在设备上完成天体位置与人类图计算
- 生成精美的个人说明书图片
- 中英文界面与解读
- 本地历史记录，可离线重新打开
- 隐私模式，可隐藏姓名、日期、时间和地点
- 保存图片到系统相册
- 使用 iOS 系统分享面板分享图片或链接

地点搜索会把你主动输入的地点文字发送给 Photon，并可能使用 ArcGIS
作为备用。姓名、出生日期和生成结果不会随地点搜索发送。本地历史只保存在
本设备，不会因为开启历史而上传。

Pluto 用于自我探索与娱乐，不提供医疗、心理、法律、财务或其他专业诊断与
建议。本应用独立开发，不隶属于 Human Design 官方机构或 My Human Design。

**Keywords**

人类图,人生说明书,自我探索,个人成长,BodyGraph,出生图,性格,反思

**Support URL**

https://human-design.wonderelian.com/support.html

**Privacy Policy URL**

https://human-design.wonderelian.com/privacy.html

**Primary Category**

生活方式

**Copyright**

© 2026 Yong Yuan

## English

**App Name**

Pluto Life Manual

**Subtitle**

On-device Human Design charts

**Promotional Text**

Turn your birth time and place into a personal Life Manual you can save, share,
and reopen offline.

**Description**

Pluto Life Manual is a Human Design tool for personal reflection and
self-exploration.

Enter a birth date, local time, and place. The app uses Swiss Ephemeris on your
device to calculate a chart and generate a BodyGraph, Type, Strategy, Inner
Authority, Profile, Definition, Incarnation Cross, and foundational reading.

Key features:

- On-device astronomical and Human Design calculation
- A polished Life Manual image
- Chinese and English interface and readings
- Local history for reopening saved results offline
- Privacy mode that hides name, date, time, and place
- Native Save to Photos
- Native iOS sharing for images and links

Place search sends only the text you enter to Photon and may use ArcGIS as a
fallback. Your name, birth date, and generated result are not included in place
search requests. Local history stays on this device and does not cause a cloud
upload.

Pluto is for personal reflection and entertainment. It does not provide
medical, psychological, legal, financial, or other professional diagnosis or
advice. This independently developed app is not affiliated with or endorsed by
official Human Design organizations or My Human Design.

**Keywords**

human design,life manual,bodygraph,self discovery,reflection,birth chart,growth

**Support URL**

https://human-design.wonderelian.com/support.html

**Privacy Policy URL**

https://human-design.wonderelian.com/privacy.html

**Primary Category**

Lifestyle

**Copyright**

© 2026 Yong Yuan

## App Review Notes

Pluto performs its chart calculation and poster rendering locally with bundled
Swiss Ephemeris WASM and SE1 data. A remote calculation API is not required.

Suggested review flow:

1. Enter synthetic birth details and a complete place.
2. Select a place suggestion if network access is available.
3. Generate the Life Manual.
4. Open Privacy Settings and enable or disable privacy mode and local history.
5. Use Save Image to exercise add-only Photos permission.
6. Use Share to open the native iOS share sheet.
7. Reopen a generated result from local history, then test history retention or
   deletion.
8. Disconnect the network and reopen an existing local result.

Network use is limited to place search through Photon, with ArcGIS as fallback,
and user-opened public support, privacy, and source links.

The content is for reflection and entertainment and is not medical,
psychological, legal, financial, or professional advice.

## Age Rating Draft

Suggested minimum audience: **13+**.

Expected questionnaire answers for the current binary:

- Cartoon, fantasy, or realistic violence: None
- Profanity or crude humor: None
- Sexual content or nudity: None
- Alcohol, tobacco, or drug references: None
- Gambling or contests: None
- Horror or fear themes: None
- User-generated content, messaging, or social networking: No
- Unrestricted web access: No
- Advertising: No
- Medical treatment information: No

The app contains personality-style self-reflection content. Final answers must
follow the current App Store Connect questionnaire and Apple's resulting age
rating; this draft does not override Apple's classification.

## App Privacy Answers Draft

- Tracking: No
- Data linked to the user: None in the current release candidate
- Data used for third-party advertising: No
- Coarse Location: do not select solely because the user manually enters a
  birth-place query; that text is not the user's or device's current location
- Name, birth details, chart, and local history: processed and stored on device,
  not collected by the developer in the current release candidate
- Diagnostics and analytics: do not declare an active analytics collection
  service while the production analytics backend remains undeployed

Phase 6B removes unavailable Cloud Save, anonymous analytics, and cloud-data
deletion controls from the Capacitor release-candidate UI when complete
Supabase configuration is absent. Automated unit and browser tests verify that
the controls are hidden and disabled, saved preferences are retained without
becoming effective consent, and local calculation does not make backend
requests. Reconfirm this behavior in the final distribution-signed archive.

Photon and ArcGIS retention behavior and the final App Privacy classification
remain an unresolved privacy gate. If a provider processes a query only in real
time and does not retain it, it is not Apple "collected data." If the search
text is retained, evaluate Search History or Other User Content against
Apple's current definitions and the provider evidence. Do not finalize the App
Privacy answers without that evidence and the exact final binary.

## Content Rights Draft

The app contains developer-authored code and content, open-source components,
Swiss Ephemeris, Human Design terminology, and a BodyGraph visual currently
classified `DERIVED_OR_UNCLEAR` by the repository provenance audit. That
classification records unresolved evidence and is not a finding of
infringement.

Do not submit a final content-rights declaration until:

1. The Swiss Ephemeris AGPL / Professional License distribution choice has been
   reviewed and documented.
2. The BodyGraph gate is resolved through reliable owner/source and independent
   creation evidence, applicable authorization, or an independently designed
   replacement.
3. Relevant Human Design terminology and branding have been reviewed for the
   intended storefronts.

No final legal clearance is claimed by this draft.

## Export Compliance Draft

`ITSAppUsesNonExemptEncryption` is currently `false`. The app does not implement
proprietary encryption. It uses standard Apple/WKWebView HTTPS transport for
network requests and SHA-256 for deterministic chart hashes, not for encrypted
communications.

The likely App Store Connect response is that the app does not contain
non-exempt proprietary encryption requiring export documentation. Confirm the
current Apple questionnaire and obtain qualified advice if the final binary or
dependencies change.

## Screenshot Shot List

Use synthetic data only. Do not show a real person's name, birth details, or
history.

1. **Create your Life Manual** - complete bilingual birth form on a small
   iPhone.
2. **Your chart, calculated on device** - centered BodyGraph and core
   properties.
3. **A reading you can understand** - concise reading emphasizing strengths,
   talent, and purpose.
4. **Save and share beautifully** - finished poster with native action controls.
5. **Private by choice** - privacy mode and on-device history settings.
6. **Reopen offline** - local history and a previously generated result.
7. **中文版本** - Chinese result and reading.
8. **English version** - English result and reading.

Prepare required iPhone screenshot sizes from the final signed build. Verify
legibility, safe areas, no clipped text, no placeholder backend state, and no
third-party visual asset for which rights evidence is missing.

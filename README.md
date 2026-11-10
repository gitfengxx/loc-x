# loc x

![loc x 应用运行截图](docs/screenshots/loc-x-main.png)

## 使用条件

- iPhone 7 / iOS 15.8.5，使用 TrollStore 安装。 【其他设备没有验证过，请自行测试】
- 需要联网使用街道地图和地点搜索；自动模式下，大陆优先高德，其他地区优先 OpenStreetMap。首次使用时，按系统提示安装并信任证书、授权 VPN 配置。
- 本工具通过本机 VPN 重写支持的网络定位请求，不替换 GPS，也不保证影响所有 App。
- 普通 `.tipa` 由 TrollStore 安装；若设备上的 `Install ldid` 不可用，可在 Mac 本地生成预处理签名包。

## 使用步骤

1. 在地图上点选位置，或搜索地点并从下拉候选中选择；可用“收藏选点”保存名称，再从“我的收藏”快速选用或删除。
2. 点“修改”，自动在原始选点周围随机偏移 8～12 米，按提示完成系统授权并等待结果。每次修改生成新坐标，收藏保留原始位置。
3. 成功后按提示到系统设置中关闭并重新打开“定位服务”，再检查目标 App。

“地图图源”可选择自动、高德或全球街道图；海外搜索建议补充城市和国家。OSM 公共服务没有可用性保证，边界附近可手动选源。

## 本地编译

需要 macOS、Xcode 命令行工具和 OpenSSL 3。在项目目录运行：

```sh
WLOC_KEYS_DIR=/path/to/private/keys python3 build.py
```

安装包生成在 `build/`。更新时复用同一个私钥目录，以保留证书身份；私钥目录不要提交到仓库。地图及重写测试可运行：

```sh
node Tests/test_map.cjs
python3 Tests/test_rewrite.py
python3 Tests/test_control.py
```

## 引用仓库原理

- [Yu9191/wloc](https://github.com/Yu9191/wloc)：参考其通过本机 VPN 代理定位服务 HTTPS 请求，并重写定位响应的工作方式。
- [spirit-n/WLOCRules](https://github.com/spirit-n/WLOCRules)：参考其定位规则检查和定点修改思路；本项目保留独立的兼容性检查、本机备份与恢复保护。
- [Leaflet](https://github.com/Leaflet/Leaflet)：用于显示地图；坐标显示换算沿用 wloc 所用的 GCJ-02 转换思路。

- [OpenStreetMap](https://www.openstreetmap.org/copyright)：提供全球街道底图，使用时显示署名并遵守缓存与瓦片使用政策。
- [Natural Earth](https://www.naturalearthdata.com/)：公有领域地理数据，用于近似判断自动图源区域，不绘制边界。

## 致谢

感谢 wloc、WLOCRules、Leaflet、OpenStreetMap 与 Natural Earth 项目及其贡献者。各项目版权和许可证按各自仓库及 `Vendor/` 中的声明保留。

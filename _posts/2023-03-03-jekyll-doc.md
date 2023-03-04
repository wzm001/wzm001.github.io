---
layout: post
title:  Mac下通过 Jekyll + Github Pages 搭建博客的一些注意事项
date:   2023-03-01 16:40:16
description: 记录在搭建过程中遇到的坑
tags: jekyll Ruby
categories: Operation
disqus_comments: true
---
# 安装 ruby和Jekyll

## 不要使用mac自带的ruby环境

这是最大的坑。mac自带一套ruby环境，如果使用该环境，执行 `gem install jekyll` 安装jekyll，会报权限不足的错误。这时候如果执行 `sudo gem install jekyll` 提升权限安装，还会报如下错误：
```bash
Building native extensions. This could take a while...
ERROR: Error installing jekyll:
ERROR: Failed to build gem native extension.
```
因为mac自带的ruby版本很老，不支持相关的操作，需要自行安装一套ruby环境。

> https://www.rubyonmac.dev/error-error-installing-jekyll-error-failed-to-build-gem-native-extension?utm_source=jekyll-talk

## 通过homebrew安装ruby

这里也有一个坑，如果你长时间没有使用过homebrew，直接执行 `brew install ruby` 安装ruby，可能会报 `no bottle available` 的错误，需要通过下面的命令更新一下brew工具：
```bash
brew upgrade
```
然后再安装ruby。安装完成后记得根据提示将ruby添加到PATH中。
再通过gem安装jekyll环境：
```bash
gem install bundler jekyll
```

# 使用 al-folio 模版

当修改完模版后本地启动时，会报错
```
Failed to open TCP connection to medium.com:443
```
需要将配置文件中如下内容注释掉：
```yml
external_sources:
	- name: medium.com
	  rss_url: https://medium.com/@al-folio/feed
```

再次启动时，日志有可能报找不到convert命令的错误，这个可以忽略。

# 总结

以上是我安装过程中遇到的一些问题。其他操作这里就不多赘述了，根据教程配置即可。
Enjoy it!
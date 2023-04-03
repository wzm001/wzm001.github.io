---
layout: page
title: esop-sign
description: 在线签署服务模块
img: assets/img/sign.png
importance: 3
category: work
---

在线签署服务是 ESOP 业务依赖的重要服务，签署业务贯穿了整个 ESOP 服务，从公司发放授予、到授予成熟行权，整个过程都需要员工签署一系列合同文件，通过法律手段保护公司和员工的权益。

ESOP 的合同签署服务由[上上签](https://www.bestsign.cn/) 提供，我们在行业通用的签署业务上进行二次封装，使之更加符合 ESOP 的业务场景。

# 上上签混合云

ESOP 使用上上签的混合云方案接入签署服务，混合云是指上上签将核心的签署逻辑通过 SDK 的方式部署到 ESOP 本地，只有用户的证书申请等业务需要和上上签云端交互，其他流程都通过和 SDK 交互完成，这么做的好处是：
1. 将上上签作为一个微服务部署到业务方本地，网络环境更可靠；
2. 合同等敏感数据可以由业务方自行管理，满足行业相关的合规要求；
但这样做也有坏处：
1. 上上签 SDK 是一个黑盒，业务方无法控制其行为，必须依赖上上签的定期升级；
2. 虽然数据由业务方自行管理，但必须依赖上上签 SDK 访问，经过 SDK 的数据丢失了业务属性，无法单独利用；

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/bestsign.png" title="bestsign" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
上上签混合云架构

# 签署服务的设计

签署服务是对 ESOP 合同签署业务的封装，对内隐藏了第三方签署服务提供商的实现细节，并改进签署流程，使之符合 ESOP 的业务场景。对外提供统一的接口规范，便于接入不同的第三方签署平台，防止对某一平台依赖太深。

目前第一阶段的实现，主要是在上上签的基础上进行封装。

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/esop-sign.png" title="esop sign" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
Esop-sign 基于上上签的架构

签署服务将 ESOP 的签署业务规范化为三个模块。

## 用户模块

主要负责 ESOP 用户（包括公司和员工）的注册认证，以及 CA 证书的申请管理（这部分功能依赖上上签），主要的业务包括用户实名认证，申请 CA 证书，管理签章图片等。

## 模版模块

模版是指生成协议的模版 PDF 文件，协议的生成过程就是通过填充模版上定义的变量，并生成新的 PDF 文件的过程，这块业务是跟 ESOP 耦合最紧密的部分。之前也是托管在上上签的，但上上签提供的通用模版无法满足 ESOP 业务复杂的需求，因此重构后的模版模块由 ESOP 自己实现，可以更好地接入我们的核心业务逻辑。

## 协议模块

协议模块主要负责协议发送、协议签署等业务，管理协议的整个生命周期，这部分流程相对清晰，大部分第三方签署服务都提供了相关的接口，ESOP 负责在这一部分做一些签署前的人脸识别、三要素认证以及签署后的关联业务处理等操作。

签署服务大致的模块如下：

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/sign-arch.png" title="esop sign" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

# 存储引擎的处理

这是签署业务的一个难点。之前介绍过，上上签的混合云架构，会导致本地的签署文件丢失业务信息，从而无法绕过上上签 SDK 单独利用。但去年对券商的合规，明确要求了境内公司的数据不能保存在境外服务器上，其他国家也有类似的要求，因此就需要我们针对签署相关的文件做数据分区处理，而上上签的混合云签署文件没有业务信息，无法处理。

签署服务着重处理这方面的问题。对于历史数据，通过反编译上上签的 war 包获取到 SDK 调用存储引擎保存文件的相关细节，然后再对本地的签署文件重新计算 hash 进行比对，确定文件所属的公司。

对于新的经过上上签 SDK 的文件，通过 SDK 的回调机制和本地存储进行比对，记录文件所属的业务信息。

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/sign-file.png" title="esop sign file" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
签署服务如何处理文件

具体的处理逻辑：
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/sign-file2.png" title="esop sign file" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

# 总结

重构后的签署服务已经上线运行，为 ESOP 的其他业务提供了稳定的签署业务支撑。

---
layout: page
title: esop
description: 员工股权管理系统
img: assets/img/esop.png
importance: 1
category: 工作
---

[ESOP](https://www.uponeshare.com/) 是我们主推的期权托管 SaaS 服务，面向企业和员工提供完整的期权托管服务，负责处理期权从授予、成熟、行权的全生命周期业务。

ESOP 整体分为 3 个服务，分别是
- 股权激励系统 esop-admin，供企业管理员使用，负责发放和管理期权；
- 行权管理系统 esop-staff，供企业员工使用，负责查看和行权；
- 内部管理系统 esop-bos，供 ESOP 运营人员使用，负责客户管理等后台业务；

这三个主服务之下，是 esop 的一系列微服务架构，整体的架构如下图所示：

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/esop-arch.png" title="push node" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    ESOP 的服务架构
</div>

各个微服务之间通过共享数据存储和 RPC 框架通信。

ESOP 的核心业务概念是 *授予（Grant）*。授予当作动词理解，即公司授予员工某些权益和激励的动作。授予作为名词理解，代表员工被赋予的权益，公司通过授予激励员工做出更大的贡献。

授予有多种形式的载体，常见的有：
- 期权 Option，一般是上市前公司进行授予，许诺员工在将来获取一定的公司权益；
- 限制性股票 RS，上市后公司进行授予，通常会在交易和行权上进行一定的限制，具体还可以细分为第一类限制性股票和第二类限制性股票，在处理上有一些区别；
- 现金，也有公司以现金的方式授予员工激励；

授予通常承诺的是未来的收益，因此伴随授予的必不可少的业务就是成熟规则，用来规定授予分几个批次成熟，每次成熟间隔时间是多久，成熟比例是多少等等。一般情况下，成熟的授予即可以通过行权转换为一定的收益。

ESOP 的其他细分业务非常多，这里就不展开讲解了。

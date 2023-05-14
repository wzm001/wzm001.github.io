---
layout: page
title: esop
description: 员工股权管理系统
img: assets/img/esop.png
importance: 1
category: 工作
---

[ESOP](https://www.uponeshare.com/) 是我们主推的期权托管 SaaS 服务，面向企业和员工提供完整的期权托管服务，负责处理期权从授予、成熟、行权的全生命周期业务。

ESOP 的整体的架构如下图所示：

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/esop-arch.png" title="push node" class="img-fluid rounded z-depth-1"  zoomable=true %}
    </div>
</div>
<div class="caption">
    ESOP 的服务架构
</div>

各个微服务之间通过共享数据存储和 RPC 框架通信。

ESOP 的微服务有两套环境，分别在北京和香港部署。这是国家对券商行业的限制，上市公司的信息只能存放到上市地所在的服务器。两套环境之间的数据彼此隔离，只有发生公司上市退市等操作时才会涉及到数据迁移操作。前端通过登录服务返回的标识确定接下来该用户需要访问哪一套环境，整个过程对用户是无感知的。

ESOP 服务内按照公司做多租户设计，各个公司之间彼此数据隔离，每个公司只能查看到自己的数据，多租户设计的底层是由 `Mybatis-Plus` [实现](https://baomidou.com/pages/aef2f2/) 的。

ESOP 的核心业务概念是 *授予（Grant）*。授予当作动词理解，即公司授予员工某些权益和激励的动作。授予作为名词理解，代表员工被赋予的权益，公司通过授予激励员工做出更大的贡献。

授予有多种形式的载体，常见的有：
- 期权 Option，一般是上市前公司进行授予，许诺员工在将来获取一定的公司权益；
- 限制性股票 RS，上市后公司进行授予，通常会在交易和行权上进行一定的限制，具体还可以细分为第一类限制性股票和第二类限制性股票，在处理上有一些区别；
- 现金，也有公司以现金的方式授予员工激励；

授予通常承诺的是未来的收益，因此伴随授予的必不可少的业务就是成熟规则，用来规定授予分几个批次成熟，每次成熟间隔时间是多久，成熟比例是多少等等。一般情况下，成熟的授予即可以通过行权转换为一定的收益。

ESOP 的其他细分业务非常多，这里就不展开讲解了。

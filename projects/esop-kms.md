#---
#layout: page
#title: esop-kms
#description: 通用的密钥管理服务
#img: assets/img/kms.png
#importance: 4
#category: 工作
#---

ESOP 对数据的安全性要求很高，有很多敏感数据都不允许明文存储，因此在运行过程中需要处理大量的数据加解密。为了便于管理和维护，提高加解密服务的安全性，设计了 KMS 密钥管理服务，为 ESOP 提供统一的、可靠的加解密服务。服务主要解决两个问题：
1. 统一管理密钥。密钥分散在配置文件中不方便管理，并且安全性差；
2. 本地加解密。通过 RPC 的方式进行加解密会拉低系统的吞吐量，影响性能；

# KMS 的基础架构

首先需要明确 KMS 的几个核心概念：

- MK：Master Key，KMS 本身的根密钥，负责加密 KMS 自身的核心信息，这个密钥的管理至关重要，可以将之分为多个部分由多人管理，或者使用硬件设备进行管理；
- CMK：Customer Master Key，客户主密钥，对应一个业务模块，由管理员负责发放，在 ESOP 业务中，每个微服务对应一个 CMK，CMK 负责存储业务方的敏感信息，如 DEK 链；
- DEK：Data Encrypt Key，数据加密密钥，负责业务方具体的数据加解密，由业务方请求 KMS 服务生成，保存在业务本地，之后的加解密都在业务本地进行；基于安全性考量，DEK 建议定期修改。


<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/key-chain.png" title="密钥链" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    密钥的链式管理
</div>

## 本地加解密流程

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/local-encrypt.png" title="本地加解密" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    本地加解密
</div>

### 加密过程：

1. 业务服务通过 kms 获取到数据加密密钥 dek；
2. 使用 dek 将对应的数据加密；
3. 将加密后的数据和加密后的 dek 存储在本地；

### 解密过程：

1. 业务服务通过 kms 解密得到密钥 dek；
2. 使用 dek 解密数据；



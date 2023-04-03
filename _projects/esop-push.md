---
layout: page
title: esop-push
description: 通用的业务消息推送系统
img: assets/img/msg-delivery.png
importance: 2
category: work
---

Esop-Push 是一个消息分发系统，支持推 / 拉 两种模式分发消息，负责将业务消息分发到第三方。

# 什么是消息？

推送服务处理的消息，指的是影响用户数据和状态的业务事件，例如员工授予成熟、授予取消、行权提醒等业务，这些消息需要以不同的形式发送给对应的员工。目前系统支持的形式有：
- 邮件
- 短信
- 老虎 APP 内推送
- 钉钉 / 飞书 / 企业微信 等公共平台
- 百度如流 等企业自建服务

# 系统的难点

推送服务面临两个技术难点：

1. 如何设计一套通用的框架，支持接入不同的第三方平台。因为每种平台接受消息的方式不一致，有些是接受推送，有些是主动拉取。并且不同平台的 API 也不一致，何如在这些不一致中抽象出统一的业务逻辑，屏蔽各自的细节，方便系统的扩展和维护，这是需要解决的第一个问题；
2. 如何提高系统的可用性。ESOP 的业务有数据量大、并发峰值高的特点。比如某公司有 10000 名员工被授予了在同一时间成熟的期权，当到达期权成熟的时间点时，系统会一次性发出 10000 条通知消息，峰值压力就会落在推送服务上；

在重构的过程中，我着重处理了上述两个问题。

## 消息任务模块

重构前的推送服务采用同步方式发送消息，这样的处理方式暴露了一些问题：

1. 推送服务发送消息的动作阻塞了业务方；
2. 推送服务内部的错误侵入到业务方系统中，业务边界不清晰；
3. 推送服务发送消息失败后，依赖业务方发起重试。但业务方的很多消息都依赖于当时的时间点，重试过程中重新发送的请求上下文已经发生改变，造成部分消息丢失；
4. 业务方的调用请求没有记录，影响后续跟踪和定位问题；
5. 如果短时间内大量请求进入推送服务，可能导致服务压力过大而崩溃；

总结上述问题，其实就是因为推送服务没有和业务方有效解耦，基于这样的前提，在推送服务中添加了消息任务的模块，任务模块把业务方和推送服务内部隔离开，起到控制和缓冲的作用。

任务模块如何工作？

- 通过消息队列与业务方对接。业务方发送消息到消息队列，推送服务的任务模块消费消息；
- 任务模块消费消息的过程，只需要保存当前消息，保存完成后即可发送 `ack` 给消息队列，后续的消息分发由推送服务内部调度；
- 任务模块为什么要保存消息，而不是直接分发消息呢？主要是基于业务功能的考虑。推送服务需要在页面上展示消息的发送追踪过程，也支持用户在页面上指定某条消息重新发送。并且如果消息发送失败，推送服务也需要找到原始的消息记录进行重试；

加入消息任务模块后的推送服务调用流程：
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/push-task.png" title="push task" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

对于数据库中的任务日志，采用定期删除的策略，只保留最近一段时间的日志，防止数据量过大引起查询效率低下。

## 推送节点模块

推送节点是对上游业务节点的抽象，比如“授予生效”业务，在推送服务会关联一个节点，该节点代表上游服务的某一个业务。

为什么要引入节点的概念？主要是方便管理业务消息模版。因为推送服务支持为不同的公司（推送对象）定制消息模版，同一个业务节点，发送给不同公司员工的消息内容，可能是不一样的，因此推送服务通过节点管理不同的消息模版，方便用户配置。

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/push-node.png" title="push node" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
推送节点的处理流程

## 消息分发模块

消息发送模块负责实际的消息分发业务。模块将消息抽象出四个概念：

### 消息渠道 Message Channel

消息通过哪种渠道进行分发。例如邮件、短信等。目前推送服务支持的渠道有：
```java
EMAIL(ReceiverTypeEnum.EMAIL, "邮件"),  
SMS(ReceiverTypeEnum.PHONE, "短信"),  
TIGER_APP(ReceiverTypeEnum.EMAIL, "老虎APP"),  
DING_TALK(ReceiverTypeEnum.PHONE, "钉钉"),  
FEI_SHU(ReceiverTypeEnum.EMAIL, "飞书"),  
WECHAT_WORK(ReceiverTypeEnum.NONE,"企业微信"),  
INFO_FLOW(ReceiverTypeEnum.NONE,"如流");
```


### 消息来源 Message Source

用于封装消息发送方的相关信息，不同的渠道有不同的内容。例如邮件渠道包括发件人名称和邮箱，飞书渠道包括发件应用的 ID、密钥等信息。

### 消息内容 Message Content

消息正文，不同的渠道有不同的渲染逻辑。

#### 消息接收方 Message Destination

接收方和消息来源一一对应，不同的渠道有不同的内容。

消息接口的定义：
```java
public interface Message {  
  
    /**  
     * 获取消息渠道  
     * @return  消息渠道  
     */  
    MessageChannelEnum getChannel();  
  
    /**  
     * 获取消息来源  
     * @return  消息来源  
     */  
    MessageSource getSource();  
  
    /**  
     * 获取消息正文  
     * @return 消息正文  
     */  
    String getContent();  
  
    /**  
     * 获取消息发送地址  
     * @return  消息发送地址  
     */  
    MessageDestination getDestination();  
  
}
```

消息统一由 `MessageSender` 处理：
```java
public interface MessageSender {  
  
    /**  
     * 发送消息  
     * @param message   消息  
     * @return  消息ID  
     */    
     String send(Message message);  
  
    /**  
     * 追踪发送结果  
     * @param messageId 消息ID  
     * @return  发送结果  
     */  
    SendResult trace(String messageId);  
  
}
```

抽象出这些概念后，不同的渠道只需要实现对应的接口即可，不会对外界有任何影响。

# 总结

推送服务是一个底层消息分发服务。需要努力保证自身的可用性，对外保持精简的接口，减少业务方的对接成本。自身要有明确的业务边界，谨慎添加新功能，这需要研发在需求评估过程中严格把关，不要让本该属于业务方的需求污染了推送服务。

在代码层面，尽量满足开闭原则，不要让新功能影响了之前的代码，推送服务会不断接入新的消息渠道，底层的改动需要注意封装和单元测试。
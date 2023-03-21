---
layout: post
title: MySQL 的索引结构
date: 2023-03-15 11:00:00+0800
description: MySQL 的索引实现细节
tags: MySQL 索引 InnoDB
categories: Database MySQL
giscus_comments: true
---

本文重点讨论 InnoDB 的索引结构，不涉及 MySQL 的其他存储引擎。

如果从**索引的物理结构**来分类的话，InnoDB 支持三种索引数据结构：

* B 树索引 B-tree Indexes，最常用的索引结构
* R 树索引 R-tree Indexes，用于空间数据的索引，一般场景不接触
* 全文索引 Full-text Indexes，用于文本全文检索

> 注意：InnoDB 不支持 Hash 索引，只在引擎内部使用哈希索引来实现自适应哈希索引功能

本文重点介绍 B 树索引。

# B 树索引

B 树是数据库使用最广泛的索引类型。为什么数据库都不约而同地使用 B 树实现索引呢？要搞清楚这个问题，我们需要先了解一下，什么是 B 树。

> 注意：MySQL 中的 *B 树索引*是一个专有名词，并不是说这个索引是数据结构 *B 树* 实现的，可以理解为**类 B 树**的索引实现

## 什么是 B 树索引？

在计算机科学中，B 树是一个自平衡的多叉搜索树（平衡多路查找树）。B 树是专为磁盘等外部存储设备设计的数据结构，可以有效地减少磁盘 I/O 次数，提高查询效率。通常，B 树中每个节点对应一次磁盘 I/O 获取到的数据（磁盘块）的整数倍。例如 MySQL InnoDB 引擎使用“页”的概念管理磁盘数据，一页的默认大小为 16 KB。

下图是 B 树的示例：

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/b-tree.png" class="img-fluid rounded z-depth-1"%}
    </div>
</div>

B+ 树是 B 树的优化，使其更适合实现外部存储的索引结构。InnoDB 就是使用 B+ 树实现索引的。因为 B 树的非叶子节点除了存储 key 之外，还存储了 data。如果 data 数据量大的话，会挤压 key 的存储空间，导致树的深度变大，增加查询时的 I/O 次数。因此 B+ 树在此基础上，约定*所有的数据节点都按照顺序存放在同一层的叶子节点上，而非叶子节点只存放 key 的信息*，这样可以增加每个节点存储 key 的数量，降低树的高度。

B+ 树相对于 B 树的几个不同点：

* 非叶子节点只存储键值信息；
* 数据记录都存放在叶子节点之间；
* 所有叶子节点之间都有一个链表指针（因为数据是有序的）；

下图是 B+ 树的示例：

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/b+tree.png" class="img-fluid rounded z-depth-1"%}
    </div>
</div>

B 树索引在应用层面，又分为了两种类型：

* 聚簇索引 Clustered Indexes
* 二级索引 Secondary Indexes

下面分别介绍这两种索引。

### 聚簇索引 Clustered Indexes

每个 InnoDB 表（以下简称表）都有一个特殊的索引，称为聚簇索引，用于存储行数据。可以把聚簇索引理解为数据库组织表数据的一种数据结构，和数据库的主键同义，目的是提高数据的检索效率。

聚簇索引的 key 就是表的主键。这里的索引 key 选择有以下[规则](https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html)：

* 如果表中定义了 `PRIMARY KEY`，则使用该列作为聚簇索引；
* 如果表中没有定义 `PRIMARY KEY`，则使用表中第一个出现的 `UNIQUE` 且列定义为 `NOT NULL` 的索引作为聚簇索引；
* 如果以上两个条件都不满足，InnoDB 会使用行 ID 生成名为 `GEN_CLUST_INDEX` 的隐藏聚簇索引；

> InnoDB 表一定*有且仅有*一个聚簇索引

下图展示了 MySQL 的聚簇索引结构：

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/clustered-index.png" class="img-fluid rounded z-depth-1"%}
    </div>
</div>

我们注意到，非叶子节点存放的是主键的值以及页面指针，叶子节点存放的是主键的值和主键对应的行数据。

每个叶子节点都包含多行的数据，并且 MySQL 为每个叶子节点默认保留 1/16 的空白空间，用于存放之后索引数据的更新。

> 参见：[15.6.2.2 The Physical Structure of an InnoDB Index](https://dev.mysql.com/doc/refman/8.0/en/innodb-physical-structure.html)

由于聚簇索引存放的数据都是有序的，所以主键的插入顺序至关重要，如果主键按顺序插入，对于 MySQL 来说，只要简单地将数据追加到叶子节点尾部即可；可是如果插入顺序是随机的，就会导致插入操作变成往已有数据中间插入，效率降低，而且如果页已满，还会导致“页分裂”，增加额外的开销，因此聚簇索引的最佳实践是使用有序的主键，顺序插入（反例：使用 UUID 作为主键）

### 二级索引 Secondary Indexes

聚簇索引以外的索引（除主键之外的列上创建的索引），成为二级索引。相比于聚簇索引的值为表中整行数据，二级索引的值为该行对应的主键。因此如果要通过二级索引查询对应的数据行，需要先查到主键后再从聚簇索引查到对应的行，这个操作被称为“回表”，是 SQL 优化时需要考虑的一个问题。

为什么二级索引不存放对应行的指针，而是存放对应行的主键呢？有以下几个原因：

1. 可以减少当出现行移动或者数据页分裂时二级索引的维护工作；
2. 联表查询使用索引更方便操作；
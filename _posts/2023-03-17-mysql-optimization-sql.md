---
layout: distill
title: MySQL 性能优化之 EXPLAIN 关键字
date: 2023-03-17 10:15:00+0800
description: MySQL 的优化操作
tags: MySQL 性能优化 EXPLAIN
categories: Database MySQL
giscus_comments: true

toc:
  - name: EXPLAIN 关键字
    subsections:
      -name: EXPLAIN 的输出列
  - name: 优化实例
    subsections:
      -name: SQL 1
---

本系列分为多个主题，主要参考学习了 MySQL 参考手册中关于[优化](https://dev.mysql.com/doc/refman/8.0/en/optimization.html) 的相关章节，重点整理工作中经常遇到的内容。

# EXPLAIN 关键字

`EXPLAIN` 关键字显示了 MySQL 的执行计划，可以用来分析 MySQL 优化器是如何选择合适的方式执行查询。`EXPLAIN` 可以和 `SELECT`、`DELETE`、`INSERT`、`UPDATE` 和 `REPLACE` 语句组合使用。
 
`EXPLAIN` 为 `SELECT` 语句中使用的每一个表返回一行信息，并且按照 MySQL 处理语句时读取它们的顺序列出。也就是说 MySQL 将会从第一行展示的表中读取信息，然后再在第二行展示的表中找到匹配的行，然后是第三行……依次类推。当所有的表都处理完后，MySQL 将选择的列输出。然后在进行下一次操作，直到找到所有匹配的结果。

## EXPLAIN 的输出列

下表列出了 `EXPLAIN` 每一行输出的列信息：

| Column | JSON Name | 说明 |
|--------|--------------|------|
| id | select_id | `SELECT` 的标识符，这是查询中 `SELECT` 的序号，如果该行属于其他行 union 的结果，则该值为 null，此时 `table` 列显示的名称类似于 `<unionM,N>`，表示该行来自 id 为 M 和 N 的查询的并集
| select_type | (None) | `SELECT` 的类型。具体类型见下面的表格
| table | table_name | 输出行对应的表名，可以是下列值：<br />  <li>&#60;unionM,N&#62;: 该行来自 id 为 M 和 N 的查询结果的并集</li><li>&#60;derivedN&#62;: 该行来自 id 为 N 的查询派生表，例如可能来自 FROM 子句中的子查询</li><li>&#60;subqueryN&#62;: 该行来自 id 为 N 的行的具体化子查询结果</li> |
| partitions | partitions | 匹配的分区，非分区表的值为 NULL
| type | access_type | 访问数据的类型。具体见下面的表格
| possible_keys | possible_keys | 可供选择的索引，如果此列为 NULL，表示查询没有可用使用的索引，这种情况下需要检查 WHERE 条件是否有适用的索引
| key | key | 实际选择的索引，这里列出的值可能不包含在 `possible_keys` 列中，这意味着 WHERE 条件没有用到索引，但查询的列是从索引中获取的，也就是索引覆盖的场景。<br />如果要强制 MySQL 使用或忽略 `possible_keys` 列出的索引，可以使用 `FORCE INDEX`、`USE INDEX`或`IGNORE INDEX`  
| key_len | key_len | 索引使用的字节数
| ref | ref | 显示将哪些列或常量与`key`列中的索引值进行比较以从表中选择行。如果值为 `func`，则使用的值是某个函数的结果。可以在 `EXPLAIN` 之后使用 `SHOW WARNINGS` 查看扩展输出。该函数实际可能是一个运算符，例如算术运算符
| rows | rows | 估计要检查的行，对于 InnoDB 来说，这个值是估计的，可能并不准确
| filtered | filtered | 按表的查询条件过滤的行百分比，最大为 100，表示没有发生行过滤
| Extra | (None) | 附加信息

### `select_type` 列对应的值

| `select_type` Value | JSON Name | 说明 |
|--------------------|-------------|-------------|
| SIMPLE | (None) | 简单的 `SELECT`，不使用 `UNION` 或子查询
| PRIMARY | (None) | 最外层的 `SELECT`
| UNION | (None) | 联表查询中的第二个或之后的 `SELECT` 语句
| DEPENDENT UNION | dependent(true) | 联表查询中的第二个或之后的 `SELECT` 语句，依赖于外部查询
| UNION  RESULT | union_result | 联表查询的结果
| SUBQUERY | (None) | 子查询中的第一个 `SELECT` 
| DEPENDENT SUBQUERY | dependent(true) | 子查询中的第一个 `SELECT` ，依赖于外部查询
| DERIVED | (None) | 派生表
| DEPENDENT DERIVED | dependent(true) | 派生表，依赖于另一张表
| MATERIALIZED | materialized_from_subquery | 物化的子查询？
| UNCACHEABLE SUBQUERY | cacheable(false) | 无法缓存的子查询，外部查询的每一行都需要重新执行
| UNCACHEABLE UNION | cacheable(false) | 不可缓存的子查询中的第二个或之后的查询
| DELETE / UPDATE / REPLACE |  | 非 `SELECT` 类型的语句，展示的是语句类型

### `type` 列对应的值

#### system

该表只有一行（=系统表）。这是 const 连接类型的一个特例。

#### const

该表最多有一个匹配行，在查询开始时读取。因为只有一行，优化器可以将这一行的值视为常量。const 非常快，因为只需要查询一次。
当主键索引或唯一索引与常量比较时，将使用 const。例如下列查询：
```sql
select * from tb1_name where primary_key = 1;
select * from tb1_name where primary_key_part1 = 1 and primary_key_part2 = 2;
```

#### eq_ref

索引查找。对于先前表中的每个组合，都从该表中读取一行。这是除了 `system` 和 `const` 之外最好的连接类型。当连接使用索引的所有部分并且索引是 `PRIMARY KEY` 或 `UNIQUE NOT NULL` 类型时使用。

`eq_ref` 可用于使用 `=` 运算符进行比较的索引列。比较值可以是常量或表达式。例如：
```sql
select * from ref_table, other_table 
 where ref_table.key_column = other_table.column;

select * from ref_table, other_table
 where ref_table.key_column_part1 = other_table.column
 and ref_table.key_column_part2 = 1;
```

#### ref

索引查找。对于先前表中行的每个组合，从该表中读取具有匹配索引值的所有行。如果连接仅使用键的最左前缀，或者如果键不是 `PRIMARY KEY` 或 `UNIQUE` 索引（也就是说，如果连接不能根据键值选择耽搁行），则使用 `ref`。如果使用的键值匹配几行，这是一个很好的连接类型。例如：
```sql
select * from ref_table where key_column = expr;

select * from ref_table, other_table
 where ref_table.key_column = other_table.column;

selct * from ref_table, other_table
 where ref_table.key_column_part1 = other_table.column
 and ref_table.key_column_part2 = 1;
```

#### fulltext

使用全文索引执行连接。

#### ref_or_null

这种连接类型类似于 `ref`，但 MySQL 会额外搜索包含 `NULL` 的行。这种连接类型优化最常用语解析子查询，例如：
```sql
select * from ref_table where key_column = expr or key_column is null;
```

#### index_merge

此连接类型使用了索引合并优化。在这种情况下，输出行的 `key` 列包含了使用的索引列表，`key_len` 包含使用的索引的最长键部分列表。

#### unique_subquery

此类型替换 `eq_ref` 用于一下形式的某些 `IN` 查询：
```sql
value IN (SELECT primary_key FROM single_table WHERE some_expr)
```
表示子查询的结果可以通过唯一索引获取。

#### index_subquery

此类型类似于 `unique_subquery` ，区别是子查询使用非唯一索引。

#### range

仅检索给定范围内的行，使用索引来选择行。输出行的 `key` 列指示使用了哪个索引。`key_len` 包含使用过的最长键部分。对于这种类型，`ref` 列是 NULL。

range可能用于 `=, <>, >, >=, <=, IS NULL, <=>, BETWEEN, LIKE, IN` 操作中。

#### index

此类型与下面的全表扫描 `ALL` 相同，区别是扫描了索引树。有两种情况：

- 如果查询是覆盖索引，无需回表的话，`Extra` 列会显示 `Using index`，仅扫描索引通常比全表扫描更快，因为索引的大小通常小于表数据。
- 如果索引无法覆盖查询，则 `Extra` 列不会显示 `Using index`。

当查询仅使用单个索引的列时，MySQL 可以使用该连接类型。

#### all

全表扫描。这是性能最差的连接方式，应该尽量避免。

### Extra 列的额外信息说明

Extra 列在不同的场景下展示的信息很多。这里只列出一些常见的信息，更详细的内容参考[这里](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html#explain-join-types)

#### Using filesort

MySQL 必须执行额外的数据传递，以完成结果的检索排序。而不是按照索引次序从表中读取行。这意味着查询效率低下。
MySQL 有两种文件排序算法，都可以在内存或磁盘上完成，因此出现这个信息并不意味着一定使用了磁盘排序。

#### Using index

仅使用索引树中的信息查询，不需要执行额外的查找。也就是使用了覆盖索引优化。

#### Using index condition

通过访问索引元组并首先测试它们以确定是否读取完整的表。以这种方式，索引信息用于延迟（下推）读取全表，具体参考[索引下推优化](https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html)。

#### Using index for group-by

表示 MySQL 找到一个索引，可以用于检索 `group by` 或 `distinct` 查询的所有列，而无需对实际的表进行任何额外的磁盘访问。

#### Using temporary

为了解析查询，MySQL 需要创建一个临时表用来保存结果。如果查询包含以不同方式列出的 `group by` 和 `order by`。这意味着查询效率低下。

#### Using where

意味着 MySQL 服务器将在存储引擎检索行之后再进行过滤。



# 优化实例
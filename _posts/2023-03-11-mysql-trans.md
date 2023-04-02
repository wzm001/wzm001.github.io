---
layout: post
title: MySQL 事务支持
date: 2023-03-11 17:30:00+0800
description: MySQL 的事务支持细节
tags: MySQL 事务 InnoDB
categories: Database MySQL
giscus_comments: true
---

前面几篇整理了事务的一些通用概念，这一篇梳理一下 MySQL 是如何支持事务的。本篇主要梳理 InnoDB 的实现逻辑，不包含其他存储引擎。

# InnoDB 的锁机制

## 共享锁和排它锁

InnoDB 实现了行级别和表级别的共享锁 (S) 和排它锁 (X)。持有共享锁的事务可以读取对应的行，持有排它锁的事务可以修改或删除该行。

共享锁和排它锁的兼容性：

| 事务锁 | S | X |
|:---:|:---:|:---:|
| S | Compatible | Conflict |
| X | Conflict | Conflict |

## 意向锁

上面介绍了 InnoDB 在行级别的共享锁和排它锁，InnoDB 还有表级别的共享锁和排它锁。InnoDB 同时支持多粒度锁定，允许表锁和行锁并存。例如 `LOCK TABLE ... WRITE` 之类的语句在指定的表上获取排它锁。

考虑这样一个场景：事务 A 在表 `test` 中的某行加了 S 锁，事务 B 需要在 `test` 整个表上加 X 锁，此时事务 B 需要遍历表中的每一行，判断该行是否被锁定，效率十分低下。因此 InnoDB 添加了意向锁，*它是表级别的锁，用来标记当前表中是否有某些行被锁定或即将被锁定*。

有两种类型的意向锁：

- 意向共享锁（IS）：表示事务打算在表中某行上加共享锁；
- 意向排它锁（IX）：表示事务打算在表中某行上加排它锁；

设置行锁前，需要先获取到对应的意向锁。例如 `SELECT ... FOR SHARE` 语句会在表上获取 IS 锁，`SELECT ... FOR UPDATE` 会在表上获取 IX 锁。

意向锁的协议如下：

- 在事务可以获取表中某行的共享锁之前，必须先获取到表上的 IS 锁或 IX 锁；
- 在事务可以获取表中某行的排它锁之前，必须先获取到表上的 IX 锁；

下表整理了 *表级锁* 的兼容性：
|  | X | IX | S | IS |
|--|--|--|--|--|
| X | Conflict| Conflict | Conflict | Conflict |
| IX | Conflict | Compatible | Conflict | Compatible |
| S | Conflict | Conflict | Compatible | Compatible |
| IS | Conflict | Compatible | Compatible | Compatible |

如果锁冲突，当前事务需要被阻塞，直到等待的锁资源被释放出来。

意向锁只会阻塞表锁，不会阻塞其他意向锁或行锁，意向锁的主要目的是为了标记当前表中存在（或即将出现）行锁。

## 记录锁 Record Locks

记录锁是索引记录上的锁。对于 InnoDB 而言，指的就是聚簇索引上的锁，也就是行锁。

## 间隙锁 Gap Locks

间隙锁是索引记录之间的间隙上的锁。或者是第一条索引记录之前的间隙以及最后一条索引记录之后的间隙。例如：
```sql
select c1 from t where c1 between 10 and 20 for update;
```
这条语句会获取 10～20 的间隙锁。防止其他事务插入 `c1 = 15` 的记录。

间隙锁锁定的是行之间的间隙，无论间隙内是否有真实的行存在。

对于语句：
```sql
select * from child where id = 100;
```
如果 `id` 列是主键或者唯一索引，则该语句只加行锁。如果 `id` 列没有索引或只有非唯一性索引，则该语句会锁定前面的间隙（防止幻读）。

另外，间隙锁不会互斥，不同事务可以在相同的间隙上持有间隙锁。

如果事务隔离级别调整为 RC，MySQL 会禁用间隙锁。

## 临键锁 Next-key Locks

临键锁是 *索引记录上的记录锁* 加上 *索引记录之前的间隙锁*。临键锁可以防止幻读。在 MySQL 默认的 RR 隔离级别中，InnoDB 使用临键锁进行搜索和索引扫描。（只限与没有索引和非唯一索引的列，唯一索引列使用记录锁）

## 插入意向锁 Insert Intention Locks

插入意向锁是一种在行插入之前由 `insert` 操作设置的间隙锁，这个锁表示插入的意图。

## 自增锁 AUTO-INC Locks

自增锁是一种特殊的*表级别*的锁，由插入到具有 `AUTO_INCREMENT` 列的表中的事务获取。目的是为了防止并发插入自增列冲突的情况。

# InnoDB 的事务隔离级别

InnoDB 支持标准的四种隔离级别。

## 可重复读 RR

InnoDB 使用最多的隔离级别，也是默认的隔离级别。可重复读使用快照支持*一致性读取*。当事务开启时建立快照，整个事务过程中读取的数据都是一致的。

对于*锁定读取*（`SELECT ... FOR UPDATE` 或 `SELECT ... FOR SHARE`）和 `UPDATE` 以及 `DELETE` 语句，锁定范围取决于搜索条件是否使用了唯一索引。

- 如果搜索条件使用了唯一索引，InnoDB 只锁定找到的索引记录，而不锁定其之前的间隙；
- 如果不是唯一索引搜索，InnoDB 锁定扫描的索引范围，使用间隙锁或临键锁来阻止其他事务插入到该范围覆盖的间隙中。

## 读已提交 RC

读已提交级别的一致性读取，会在事务中使用多个快照，每次读取的数据都是最新提交的一致性快照。

对于锁定读取或更新，InnoDB 只锁定索引记录，不锁定它们之间的间隙。


# 一致性非阻塞读取

InnoDB 使用 MVCC 机制支持一致性非阻塞读取，因此事务中正常查询是不需要加锁的。

例如在默认的 RR 隔离级别下：

假设测试表 `employee` 有如下数据：
```
mysql> select * from employee;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  3 | Gike     |      19 | beijing |
|  1 | Jimmy    |      21 | beijing |
|  2 | Jone     |      20 | hk      |
+----+----------+---------+---------+
3 rows in set (0.00 sec)
```

 开启事务A，在事务中查询年龄大于20岁的员工：
```
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from employee where emp_age > 20;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  1 | Jimmy    |      21 | beijing |
+----+----------+---------+---------+
1 row in set (0.01 sec)
```

开启事务B，在事务中修改 Jone 的年龄为 22 岁，并提交事务：
```
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> update employee set emp_age = 22 where emp_name = 'Jone';
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> commit;
Query OK, 0 rows affected (0.00 sec)
```

此时事务A还没有提交，再次执行相同的查询，发现结果仍然只有一条，新的数据没有查到：(前提是在 RR 隔离级别下)
```
mysql> select * from employee where emp_age > 20;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  1 | Jimmy    |      21 | beijing |
+----+----------+---------+---------+
1 row in set (0.00 sec)
```

直到事务A提交之后再次查询，才能看到最新的数据：
```
mysql> commit;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from employee where emp_age > 20;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  1 | Jimmy    |      21 | beijing |
|  2 | Jone     |      22 | hk      |
+----+----------+---------+---------+
2 rows in set (0.00 sec)
```

这里需要注意：*一致性快照读取只针对读取操作，更新和删除操作不会走快照*。因此其他事务提交的内容有可能被当前事务修改。我们还以上面的表为例说明，现在的初始数据为：

```
mysql> select * from employee;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  3 | Gike     |      19 | beijing |
|  1 | Jimmy    |      21 | beijing |
|  2 | Jone     |      22 | hk      |
+----+----------+---------+---------+
3 rows in set (0.00 sec)
```

开启事务A，查询年龄小于 20 岁的员工：
```
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from employee where emp_age > 20;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  3 | Gike     |      19 | beijing |
+----+----------+---------+---------+
1 rows in set (0.00 sec)
```

开启事务B，修改 Jone 的年龄为 18 岁，并提交事务：
```
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> update employee set emp_age = 18 where emp_name = 'Jone';
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> commit;
Query OK, 0 rows affected (0.00 sec)
```

在事务A中删除年龄小于 20 岁的员工：
```
mysql> delete from employee where emp_age < 20;
Query OK, 2 rows affected (0.01 sec)
```

我们注意到这条语句删除了两条记录，虽然在这个事务中查询年龄小于 20 岁的员工记录时只查到了一条，但删除的时候却删除了两条，因为还有一条记录是事务 B 提交的。

提交事务 A 后再次查询表中的记录，发现只剩下一条了：
```
mysql> commit;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from employee;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  1 | Jimmy    |      21 | beijing |
+----+----------+---------+---------+
1 row in set (0.00 sec)
```

对于 `INSERT INTO ... SELECT`，`UPDATE ... (SELECT)` 和 `CREATE TABLE ... SELECT` 语句的 SELECT 部分，如果没有指定 `FOR UPDATE` 或 `FOR SHARE`，默认情况下 InnoDB 会对这些语句使用更强的锁，SELECT 部分的行为类似于 RC 级别的查询，每次执行都会读取新快照。

# 锁定读取

在上面的第二个例子中，我们看到如果当前事务查询并修改某些数据，其他事务有可能会破坏该操作。为了避免此类问题，InnoDB 提供了锁定读取操作：`SELECT ... FOR SHARE` 和 `SELECT ... FOR UPDATE`。

我们还回到上面的例子中，此时 `employee` 表中的初始数据为：

```
mysql> select * from employee;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  1 | Jimmy    |      21 | beijing |
+----+----------+---------+---------+
1 row in set (0.00 sec)
```

开启事务 A，先查询年龄大于 20 岁的员工，使用锁定读取：
```
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from employee where emp_age > 20 for share;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  1 | Jimmy    |      21 | beijing |
+----+----------+---------+---------+
1 row in set (0.01 sec)
```

开启事务 B，先做一次同样的查询，因为事务 A 使用的是共享锁，所以事务 B 此时也是可以查询的：
```
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from employee where emp_age > 20 for share;
+----+----------+---------+---------+
| id | emp_name | emp_age | address |
+----+----------+---------+---------+
|  1 | Jimmy    |      21 | beijing |
+----+----------+---------+---------+
1 row in set (0.00 sec)
```

事务 B 修改该记录的地址为 hk：
```
mysql> update employee set address = 'hk' where id = 1;
ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
```

发现事务 B 的修改语句被阻塞了一段时间后报错退出。

提交事务 A 后，事务 B 再次执行该语句，发现可以执行了：
```
mysql> update employee set address = 'hk' where id = 1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> commit;
Query OK, 0 rows affected (0.01 sec)
```

# InnoDB 语句和锁的关系

锁定读取、更新、删除操作都会在扫描的每一条索引记录上添加临键锁，无论记录是否满足 `where` 条件。
如果在搜索条件中使用了二级索引，并且要设置的记录锁是独占的，InnoDB 也会键锁对应的聚簇索引并加锁。
如果搜索条件没有用到索引，那么必须通过全表扫描来处理，这样表中的每一行都会被锁定，因此会阻塞其他事务的插入操作。对查询条件创建必要的索引很重要。

下面具体分析不同语句的加锁情况：

- `SELECT ... FROM` 语句是一致性读取，通过 MVCC 实现，不需要加锁。（除非隔离级别是可串行化）
- 锁定读，如果使用了唯一索引，会首先在扫描的行上加锁，然后把不符合查询条件的行上的锁释放掉。但释放锁的操作可能不是立即发生的，最晚要等到事务提交后才释放。
- 锁定读、更新、删除操作的加锁策略，取决于语句是使用的是唯一索引或者范围查询：
	- 如果使用的是唯一索引的唯一查询，例如 `id = 1`，则只锁定找到的索引记录，不锁定记录之前的间隙；
	- 如果不满足上一个条件，则锁定使用临键锁锁定记录和记录前的间隙；
- `UPDATE ... WHERE ...` 语句修改聚簇索引时，会对关联的二级索引进行隐式锁定。当插入新的二级索引之前或执行重复检查扫描时，`UPDATE` 操作还会对受影响的二级索引记录使用共享锁；
- `INSERT` 语句会在插入的行上设置排它锁。这个锁是记录锁，不是临键锁；
- `INSERT` 操作之前会设置插入意向锁，这是一个间隙锁，多个事务之间可以同时锁定同一个间隙；
- 如果检测到重复键错误，会在重复索引记录上设置共享锁；我们还以上面的 `employee` 表为例，假设有两个事务都执行如下语句：
```
start transaction;
insert into employee values (2, 'Jack', 23, 'Shanghai');
```
我们发现，第一个事务执行成功了，第二个事务阻塞了。因为第二个事务检测到重复键错误，会在该重复键上添加共享锁。但第一个事务还没有提交，所以此时重复键上还有第一个事务设置的排它锁，因此第二个事务阻塞了，直到第一个事务提交或回滚，释放了排它锁，第二个事务才能获取到共享锁继续往下执行。
还是上面的语句，如果有三个事务同时执行，首先事务一执行成功了，事务二和事务三都被阻塞（等待重复键的共享锁），当事务一回滚后，事务二和事务三都获取到了共享锁，又因为都是插入操作，还要获取到排它锁，这时候就发生死锁了。原因是事务二和事务三都在等待对方释放共享锁后获得排它锁。
```
mysql> insert into employee values (2, 'Jack', 23, 'Shanghai');
ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction
```
- `INSERT ... ON DUPLICATE KEY UPDATE` 语句和 `INSERT` 语句的区别是，当发生重复键错误时，`INSERT` 语句设置的是共享锁，而 `INSERT ... ON DUPLICATE KEY UPDATE` 设置的是排它锁。对于重复的主键，设置独占的记录锁，对于重复的唯一索引，设置独占的临键锁；
- [`REPLACE`](https://dev.mysql.com/doc/refman/8.0/en/replace.html) 语句如果没有重复键错误，和 `INSERT` 语句一样完成，如果有重复键错误，将设置排它的临键锁在要替换的行上；
- `INSERT INTO t SELECT ... FROM s WHERE ...` 语句，会在插入到 `t` 表上的每一行设置排它的记录锁，这是 `INSERT` 语句的特性。此时如果事务隔离级别为 RC，InnoDB 会在 `s` 表上执行一致性快照读取，不会加锁。如果是其他的隔离级别，InnoDB 则会在 `s` 表上扫描的行上设置共享临键锁，这是 InnoDB 的二进制日志机制要求的；
- `CREATE TABLE ... SELECT ...` 语句和上面的 `INSERT ... SELECT` 语句一样，会根据隔离级别设置共享临键锁或者不加锁；
- `REPLACE INTO t SELECT ... FROM s WHERE ...` 和 `UPDATE t ... WHERE col IN (SELECT ... FROM s WHERE ...)` 语句中的 `SELECT` 操作，会对表 `s` 中扫描的行添加共享的临键锁；
- `AUTO_INCREMENT` 列，InnoDB 会在列关联的索引末尾设置排它锁。如果 `innodb_autoinc_lock_mode = 0` ，InnoDB 会使用 `AUTO_INC` 表锁定模式，在访问自动递增计数器时获取表锁并保持到当前 SQL 语句结束（不是事务结束）。当持有 `AUTO_INC` 表锁时，其他事务无法执行插入操作。
- 如果表上设置了外键约束，则任何需要检查约束条件的插入、更新、删除操作都需要在扫描的行上添加共享记录锁。在约束检查失败的情况下也会添加这些锁。
- `LOCK TABLES` 语句会设置表锁，但这些锁是在 InnoDB 之上的 MySQL 层设置的，InnoDB 如果在 `innodb_table_locks = 1（默认值）` 且 `autocommit = 0` 时知道表锁的存在，MySQL 层也知道 InnoDB 的行锁。否则在其他情况下，InnoDB 的死锁检测无法检测到涉及此类表锁的死锁。
- 在 `innodb_table_locks = 1（默认值）` 的情况下，`LOCK TABLES` 语句会在表上获取两中表锁，一个是 MySQL 层的表锁，另一个是 InnoDB 层的表锁。
- 不能在事务执行期间锁定其他表，因为 `LOCK TABLES` 语句隐式执行了 `COMMIT` 和 `UNLOCK TABLES`。

# 总结

参考:
- [InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- 
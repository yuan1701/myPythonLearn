## 事务
在 MySQL 中，事务其实是一个最小的不可分割的工作单元。事务能够保证一个业务的完整性。

比如我们的银行转账：
```sql
-- a -> -100
UPDATE user set money = money - 100 WHERE name = 'a';
-- b -> +100
UPDATE user set money = money + 100 WHERE name = 'b';
```
在实际项目中，假设只有一条 SQL 语句执行成功，而另外一条执行失败了，就会出现数据前后不一致。

因此，在执行多条有关联 SQL 语句时，事务可能会要求这些 SQL 语句要么**同时执行成功，要么就都执行失败**。

### 如何控制事务 - COMMIT / ROLLBACK
在 MySQL 中，事务的自动提交状态默认是开启的。

#### 查询事务的自动提交状态
```sql
SELECT @@AUTOCOMMIT;
+--------------+
| @@AUTOCOMMIT |
+--------------+
|            1 |
+--------------+
```
自动提交的作用：当我们执行一条 SQL 语句的时候，其产生的效果就会立即体现出来，且不能回滚。

什么是回滚？举个例子：

```sql
CREATE DATABASE bank;
```

```sql
USE bank;
```

```sql
CREATE TABLE user (
    id INT PRIMARY KEY,
    name VARCHAR(20),
    money INT
);
```

```sql
INSERT INTO user VALUES (1, 'a', 1000);

SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
+----+------+-------+
```
可以看到，在执行插入语句后数据立刻生效，原因是 MySQL 中的事务自动将它提交到了数据库中。那么所谓回滚的意思就是，撤销执行过的所有 SQL 语句，使其回滚到最后一次提交数据时的状态。

在 MySQL 中使用 ROLLBACK 执行回滚：

-- 回滚到最后一次提交
```sql
ROLLBACK;

SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
+----+------+-------+
```
由于所有执行过的 SQL 语句都已经被提交过了，所以数据并没有发生回滚。那如何让数据可以发生回滚？

#### 关闭自动提交
```sql
SET AUTOCOMMIT = 0;
```

-- 查询自动提交状态
```sql
SELECT @@AUTOCOMMIT;
+--------------+
| @@AUTOCOMMIT |
+--------------+
|            0 |
+--------------+
```
将自动提交关闭后，测试数据回滚：
```sql
INSERT INTO user VALUES (2, 'b', 1000);
```

-- 关闭 AUTOCOMMIT 后，数据的变化是在一张虚拟的临时数据表中展示，
-- 发生变化的数据并没有真正插入到数据表中。
```sql
SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
|  2 | b    |  1000 |
+----+------+-------+
```

-- 数据表中的真实数据其实还是：
```sql
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
+----+------+-------+

```
-- 由于数据还没有真正提交，可以使用回滚
```sql
ROLLBACK;
```

-- 再次查询
```sql
SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
+----+------+-------+
```
那如何将虚拟的数据真正提交到数据库中？使用** COMMIT** :

```sql
INSERT INTO user VALUES (2, 'b', 1000);
```
-- 手动提交数据（持久性），
-- 将数据真正提交到数据库中，执行后不能再回滚提交过的数据。
```sql
COMMIT;
```

-- 提交后测试回滚
```sql
ROLLBACK;
```

-- 再次查询（回滚无效了）
```sql
SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
|  2 | b    |  1000 |
+----+------+-------+
```
#### 总结

```sql
自动提交

查看自动提交状态：
SELECT @@AUTOCOMMIT

设置自动提交状态：
SET AUTOCOMMIT = 0
```
```sql
手动提交
@@AUTOCOMMIT = 0 时，使用 COMMIT 命令提交事务。

事务回滚
@@AUTOCOMMIT = 0 时，使用 ROLLBACK 命令回滚事务。

```
事务的实际应用，让我们再回到银行转账项目：

-- 转账
```sql
UPDATE user set money = money - 100 WHERE name = 'a';
```

-- 到账
```sql
UPDATE user set money = money + 100 WHERE name = 'b';
```

```sql
SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |   900 |
|  2 | b    |  1100 |
+----+------+-------+
```
这时假设在转账时发生了意外，就可以使用 ROLLBACK 回滚到最后一次提交的状态：

-- 假设转账发生了意外，需要回滚。
```sql
ROLLBACK;

SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
|  2 | b    |  1000 |
+----+------+-------+
```
这时我们又回到了发生意外之前的状态，也就是说，事务给我们提供了一个可以反悔的机会。假设数据没有发生意外，这时可以手动将数据真正提交到数据表中：COMMIT 。

### 手动开启事务 - BEGIN / START TRANSACTION
事务的默认提交被开启 ( @@AUTOCOMMIT = 1 ) 后，此时就不能使用事务回滚了。但是我们还可以手动开启一个事务处理事件，使其可以发生回滚：

-- 使用 BEGIN 或者 START TRANSACTION 手动开启一个事务
```sql
-- START TRANSACTION;
-- or
BEGIN;
UPDATE user set money = money - 100 WHERE name = 'a';
UPDATE user set money = money + 100 WHERE name = 'b';
```

-- 由于手动开启的事务没有开启自动提交，
-- 此时发生变化的数据仍然是被保存在一张临时表中。
```sql
SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |   900 |
|  2 | b    |  1100 |
+----+------+-------+
```

-- 测试回滚
```sql
ROLLBACK;

SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |  1000 |
|  2 | b    |  1000 |
+----+------+-------+
```
仍然使用 COMMIT 提交数据，提交后无法再发生本次事务的回滚。

```sql
BEGIN;
UPDATE user set money = money - 100 WHERE name = 'a';
UPDATE user set money = money + 100 WHERE name = 'b';

SELECT * FROM user;
+----+------+-------+
| id | name | money |
+----+------+-------+
|  1 | a    |   900 |
|  2 | b    |  1100 |
+----+------+-------+
```

-- 提交数据
```sql
COMMIT;
```

-- 测试回滚（无效，因为表的数据已经被提交）
```sql
ROLLBACK;
```
### 事务的 ACID 特征与使用
#### 事务的四大特征：

```sql
A 原子性：事务是最小的单位，不可以再分割；
C 一致性：要求同一事务中的 SQL 语句，必须保证同时成功或者失败；
I 隔离性：事务1 和 事务2 之间是具有隔离性的；
D 持久性：事务一旦结束 ( COMMIT ) ，就不可以再返回了 ( ROLLBACK ) 。
```
#### 事务的隔离性
事务的隔离性可分为四种 ( 性能从低到高 ) ：

**READ UNCOMMITTED ( 读取未提交 )**

如果有多个事务，那么任意事务都可以看见其他事务的未提交数据。

**READ COMMITTED ( 读取已提交 )**

只能读取到其他事务已经提交的数据。

**REPEATABLE READ ( 可被重复读 )**

如果有多个连接都开启了事务，那么事务之间不能共享数据记录，否则只能共享已提交的记录。

**SERIALIZABLE ( 串行化 )**

所有的事务都会按照固定顺序执行，执行完一个事务后再继续执行下一个事务的写入操作。

#### 查看当前数据库的默认隔离级别：

-- MySQL 8.x, GLOBAL 表示系统级别，不加表示会话级别。
```sql
SELECT @@GLOBAL.TRANSACTION_ISOLATION;
SELECT @@TRANSACTION_ISOLATION;
+--------------------------------+
| @@GLOBAL.TRANSACTION_ISOLATION |
+--------------------------------+
| REPEATABLE-READ                | -- MySQL的默认隔离级别，可以重复读。
+--------------------------------+

```
-- MySQL 5.x
```sql
SELECT @@GLOBAL.TX_ISOLATION;
SELECT @@TX_ISOLATION;
```

#### 修改隔离级别：

-- 设置系统隔离级别，LEVEL 后面表示要设置的隔离级别 (READ UNCOMMITTED)。
```sql
SET GLOBAL TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
```

-- 查询系统隔离级别，发现已经被修改。
```sql
SELECT @@GLOBAL.TRANSACTION_ISOLATION;
+--------------------------------+
| @@GLOBAL.TRANSACTION_ISOLATION |
+--------------------------------+
| READ-UNCOMMITTED               |
+--------------------------------+
```
### 1. 脏读
测试 READ UNCOMMITTED ( 读取未提交 ) 的隔离性：

```sql
INSERT INTO user VALUES (3, '小明', 1000);
INSERT INTO user VALUES (4, '淘宝店', 1000);

SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |  1000 |
|  4 | 淘宝店    |  1000 |
+----+-----------+-------+
```

-- 开启一个事务操作数据
-- 假设小明在淘宝店买了一双800块钱的鞋子：
```sql
START TRANSACTION;
UPDATE user SET money = money - 800 WHERE name = '小明';
UPDATE user SET money = money + 800 WHERE name = '淘宝店';
```

-- 然后淘宝店在另一方查询结果，发现钱已到账。
```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |   200 |
|  4 | 淘宝店    |  1800 |
+----+-----------+-------+
```
由于小明的转账是在新开启的事务上进行操作的，而该操作的结果是可以被其他事务（另一方的淘宝店）看见的，因此淘宝店的查询结果是正确的，淘宝店确认到账。但就在这时，如果小明在它所处的事务上又执行了 ROLLBACK 命令，会发生什么？

-- 小明所处的事务
```sql
ROLLBACK;
```

-- 此时无论对方是谁，如果再去查询结果就会发现：
```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |  1000 |
|  4 | 淘宝店    |  1000 |
+----+-----------+-------+
```
这就是所谓的脏读，一个事务读取到另外一个事务还未提交的数据。这在实际开发中是不允许出现的。

### 2 读取已提交(不可重复读)
把隔离级别设置为 READ COMMITTED ：

```sql
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT @@GLOBAL.TRANSACTION_ISOLATION;

+--------------------------------+
| @@GLOBAL.TRANSACTION_ISOLATION |
+--------------------------------+
| READ-COMMITTED                 |
+--------------------------------+
```
这样，再有新的事务连接进来时，它们就只能查询到已经提交过的事务数据了。但是对于当前事务来说，它们看到的还是未提交的数据，例如：

-- 正在操作数据事务（当前事务）
```sql
START TRANSACTION;
UPDATE user SET money = money - 800 WHERE name = '小明';
UPDATE user SET money = money + 800 WHERE name = '淘宝店';
```

-- 虽然隔离级别被设置为了 READ COMMITTED，但在当前事务中，
-- 它看到的仍然是数据表中临时改变数据，而不是真正提交过的数据。
```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |   200 |
|  4 | 淘宝店    |  1800 |
+----+-----------+-------+
```


-- 假设此时在远程开启了一个新事务，连接到数据库。
```sql
$ mysql -u root -p12345612
```

-- 此时远程连接查询到的数据只能是已经提交过的
```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |  1000 |
|  4 | 淘宝店    |  1000 |
+----+-----------+-------+
```
但是这样还有问题，那就是假设一个事务在操作数据时，其他事务干扰了这个事务的数据。例如：

-- 小张在查询数据的时候发现：
```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |   200 |
|  4 | 淘宝店    |  1800 |
+----+-----------+-------+
```

-- 在小张求表的 money 平均值之前，小王做了一个操作：
```sql
START TRANSACTION;
INSERT INTO user VALUES (5, 'c', 100);
COMMIT;
```

-- 此时表的真实数据是：
```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |  1000 |
|  4 | 淘宝店    |  1000 |
|  5 | c         |   100 |
+----+-----------+-------+
```

-- 这时小张再求平均值的时候，就会出现计算不相符合的情况：
```sql
SELECT AVG(money) FROM user;
+------------+
| AVG(money) |
+------------+
|  820.0000  |
+------------+
```
虽然 READ COMMITTED 让我们只能读取到其他事务已经提交的数据，但还是会出现问题，就是在读取同一个表的数据时，可能会发生前后不一致的情况。这被称为不可重复读现象 ( READ COMMITTED ) 。

### 3. 幻读
将隔离级别设置为 REPEATABLE READ ( 可被重复读取 ) :
```sql
SET GLOBAL TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT @@GLOBAL.TRANSACTION_ISOLATION;
+--------------------------------+
| @@GLOBAL.TRANSACTION_ISOLATION |
+--------------------------------+
| REPEATABLE-READ                |
+--------------------------------+
```
测试 REPEATABLE READ ，假设在两个不同的连接上分别执行 START TRANSACTION :

-- 小张 - 成都
```sql
START TRANSACTION;
INSERT INTO user VALUES (6, 'd', 1000);
```

-- 小王 - 北京
```sql
START TRANSACTION;

```
-- 小张 - 成都
```sql
COMMIT;
```
当前事务开启后，没提交之前，查询不到，提交后可以被查询到。但是，在提交之前其他事务被开启了，那么在这条事务线上，就不会查询到当前有操作事务的连接。相当于开辟出一条单独的线程。

无论小张是否执行过 COMMIT ，在小王这边，都不会查询到小张的事务记录，而是只会查询到自己所处事务的记录：

```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |  1000 |
|  4 | 淘宝店    |  1000 |
|  5 | c         |   100 |
+----+-----------+-------+
```
这是因为小王在此之前开启了一个新的事务 ( START TRANSACTION ) ，那么在他的这条新事务的线上，跟其他事务是没有联系的，也就是说，此时如果其他事务正在操作数据，它是不知道的。

然而事实是，在真实的数据表中，小张已经插入了一条数据。但是小王此时并不知道，也插入了同一条数据，会发生什么呢？

```sql
INSERT INTO user VALUES (6, 'd', 1000);
-- ERROR 1062 (23000): Duplicate entry '6' for key 'PRIMARY'
```
报错了，操作被告知已存在主键为 6 的字段。这种现象也被称为幻读，一个事务提交的数据，不能被其他事务读取到。

### 4 串行化
顾名思义，就是所有事务的写入操作全都是串行化的。什么意思？把隔离级别修改成 SERIALIZABLE :

```sql
SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT @@GLOBAL.TRANSACTION_ISOLATION;
+--------------------------------+
| @@GLOBAL.TRANSACTION_ISOLATION |
+--------------------------------+
| SERIALIZABLE                   |
+--------------------------------+
```
还是拿小张和小王来举例：

-- 小张 - 成都
```sql
START TRANSACTION;
```

-- 小王 - 北京
```sql
START TRANSACTION;
```

-- 开启事务之前先查询表，准备操作数据。
```sql
SELECT * FROM user;
+----+-----------+-------+
| id | name      | money |
+----+-----------+-------+
|  1 | a         |   900 |
|  2 | b         |  1100 |
|  3 | 小明      |  1000 |
|  4 | 淘宝店    |  1000 |
|  5 | c         |   100 |
|  6 | d         |  1000 |
+----+-----------+-------+
```

-- 发现没有 7 号王小花，于是插入一条数据：
```sql
INSERT INTO user VALUES (7, '王小花', 1000);
```
此时会发生什么呢？由于现在的隔离级别是 SERIALIZABLE ( 串行化 ) ，串行化的意思就是：假设把所有的事务都放在一个串行的队列中，那么所有的事务都会按照固定顺序执行，执行完一个事务后再继续执行下一个事务的写入操作 ( 这意味着队列中同时只能执行一个事务的写入操作 ) 。

根据这个解释，小王在插入数据时，会出现等待状态，直到小张执行 COMMIT 结束它所处的事务，或者出现等待超时

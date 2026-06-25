循环工程的核心思想是：在给定的 任务、实现方式、结果判定方法的基础上，让 Agent 自主运行直到完成给定的任务。

任务的处理过程不需要人介入。和传统的 Agent 使用方式相比，一个是一步一步给 Agent 下发指令让 Agent 执行，一个是给Agent一个最终目标，让 Agent 自己执行。

实现过程主要考虑：
1. 终止条件：任务结束 OR 死循环处理 OR Tokan限制等等
2. 运行时上下文管理：Agent在长时间运行时，上下文窗口会迅速增大，需要通过压缩、写文件、sub-agent 等方式处理
3. 任务结果判定：有独立、明确的完成判断方式，不能依赖Agent 自己判断

参考：
1. [Loop Engineering Clearly Explained](https://x.com/akshay_pachaar/status/2069118430582866051)
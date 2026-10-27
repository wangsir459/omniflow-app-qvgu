# 工程项目认知实践结课提交说明

- 学生：254090201 鲍佳辉
- 项目：智健排班助手 Smart Gym Scheduler
- 在线系统：https://cmvlwmngs02g.useomniflow.com
- 代码仓库：https://github.com/wangsir459/omniflow-app-qvgu

## 项目简介

本项目面向校园健身房高峰期器械排队问题。学生按照训练顺序与时长录入训练循环，系统在不改变训练内容的前提下计算更合适的入场时间，并提供器械热度、维修状态、预约修改、取消、签到与候补处理能力。

## 技术结构

前端采用 React、Vite、Tailwind CSS 与 TypeScript；后端采用 Express、Drizzle ORM 和 PostgreSQL；前后端通过 REST API 通信。

## 演示流程

1. 首页查看预约概览、器械热度和维护公告。
2. 在器械库按部位筛选并查看安全说明。
3. 新建训练预约并配置训练顺序、时长和时间窗口。
4. 提交后查看预约状态，并演示修改、取消或签到流程。

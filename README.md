# Library Self-Checkout System | 图书馆自助借阅系统

[![Test Build Next.js in Ubuntu](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml/badge.svg)](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml)

## English

### What is this?

Library Self-Checkout System is a web application that helps students borrow and manage library books without waiting at a service desk. It also gives library staff the tools they need to manage books, users, loans, and reports.

The application is designed for students, library staff, and administrators at Swinburne University of Technology Sarawak Campus.

### What can users do?

**Students can:**

- Search the library catalogue and view book details.
- Borrow and return books by scanning a barcode.
- View current loans, due dates, borrowing history, and notifications.
- Reserve books and manage holds.
- Get book recommendations and use the reading assistant.

**Library staff can:**

- Check books in and out for users.
- Review loan history and damage reports.
- Monitor book copies and their availability.

**Administrators can:**

- Add and update books.
- Manage user accounts and roles.
- Review overdue loans and export reports.

### Main technology

- [Next.js](https://nextjs.org/) and React for the website.
- [Supabase](https://supabase.com/) for the database and file storage.
- Microsoft Azure AD and NextAuth for sign-in.
- Tailwind CSS for the user interface.
- Jest and Testing Library for automated tests.

### Run the project locally

#### Requirements

- Node.js 18 or newer.
- [pnpm](https://pnpm.io/).
- A Supabase project.
- A Microsoft Azure AD application registration.

#### Setup

```bash
git clone https://github.com/Kidemi04/Library_Self-Checkout_System.git
cd Library_Self-Checkout_System
pnpm install
cp .env.example .env.local
pnpm dev
```

Add your Supabase and Azure AD settings to `.env.local` before signing in. Optional integrations, such as DeepSeek, LinkedIn Learning, SIP2, and the recommendation server, are also explained in `.env.example`.

Open [http://localhost:3000](http://localhost:3000) in a browser.

### Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server. |
| `pnpm build` | Create a production build. |
| `pnpm start` | Run the production build. |
| `pnpm test` | Run all automated tests. |
| `pnpm test:watch` | Run tests in watch mode. |

> Keep passwords, API keys, and other secrets in `.env.local`. Never commit them to Git.

---

## 中文（简体）

### 这是什么项目？

图书馆自助借阅系统是一个网页应用。学生可以使用本系统自行借阅和管理图书，不必在服务柜台排队。图书馆工作人员也可以通过本系统管理图书、用户、借阅记录和报告。

本系统为斯威本科技大学砂拉越校区的学生、图书馆工作人员和管理员而设计。

### 用户可以做什么？

**学生可以：**

- 搜索馆藏并查看图书详情。
- 扫描条形码来借书和还书。
- 查看当前借阅、到期日期、借阅历史和通知。
- 预约图书并管理预约记录。
- 获取图书推荐并使用阅读助手。

**图书馆工作人员可以：**

- 协助用户办理借书和还书。
- 查看借阅历史和图书损坏报告。
- 检查馆藏副本及其可借状态。

**管理员可以：**

- 添加和更新图书资料。
- 管理用户账户和权限。
- 查看逾期借阅并导出报告。

### 主要技术

- 使用 [Next.js](https://nextjs.org/) 和 React 构建网站。
- 使用 [Supabase](https://supabase.com/) 提供数据库和文件存储。
- 使用 Microsoft Azure AD 和 NextAuth 登录。
- 使用 Tailwind CSS 设计用户界面。
- 使用 Jest 和 Testing Library 进行自动化测试。

### 在本地运行项目

#### 环境要求

- Node.js 18 或更高版本。
- [pnpm](https://pnpm.io/)。
- 一个 Supabase 项目。
- 一个 Microsoft Azure AD 应用注册。

#### 安装与启动

```bash
git clone https://github.com/Kidemi04/Library_Self-Checkout_System.git
cd Library_Self-Checkout_System
pnpm install
cp .env.example .env.local
pnpm dev
```

登录前，请在 `.env.local` 中填写 Supabase 和 Azure AD 配置。DeepSeek、LinkedIn Learning、SIP2 和推荐服务器等可选集成的配置说明可在 `.env.example` 中找到。

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动开发服务器。 |
| `pnpm build` | 创建生产版本。 |
| `pnpm start` | 运行生产版本。 |
| `pnpm test` | 运行全部自动化测试。 |
| `pnpm test:watch` | 以监听模式运行测试。 |

> 请将密码、API 密钥和其他机密信息保存在 `.env.local` 中，切勿提交到 Git。
